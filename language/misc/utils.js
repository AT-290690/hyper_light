import { compileToJs } from '../core/compiler.js'
import { cell, parse } from '../core/parser.js'
import { tokens } from '../core/tokens.js'
import { STD, protolessModule, TWO_JS_HTML } from '../extentions/extentions.js'
import { removeNoCode, wrapInBody } from './helpers.js'

export const languageUtilsString = `const _tco = func => (...args) => { let result = func(...args); while (typeof result === 'function') { result = result(); }; return result };
const _pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const _spread = (items) => Array.isArray(items[0]) ? items.reduce((acc, item) => [...acc, ...item], []) : items.reduce((acc, item) => ({ ...acc, ...item }), {});
const protolessModule = methods => { const env = Object.create(null); for (const method in methods) env[method] = methods[method]; return env;};`

export const logBoldMessage = msg => console.log('\x1b[1m', msg)
export const logErrorMessage = msg =>
  console.log('\x1b[31m', '\x1b[1m', msg, '\x1b[0m')
export const logSuccessMessage = msg =>
  console.log('\x1b[32m', '\x1b[1m', msg, '\x1b[0m')
export const logWarningMessage = msg =>
  console.log('\x1b[33m', '\x1b[1m', msg, '\x1b[0m')

const findParent = ast => {
  let out = { fn: null, res: null }
  for (const prop in ast)
    if (Array.isArray(ast[prop]))
      for (const arg of ast[prop]) {
        if (arg.type === 'apply') out.fn = arg.operator.name
        const temp = findParent(arg)
        if (temp.res !== undefined) out.res = temp.res
      }
    else if (ast[prop] !== undefined) out.res = ast[prop]
  return out
}

// export const printErrors = (errors, args) => {
//   if (!State.isErrored) {
//     State.isErrored = true
//     if (
//       errors?.message &&
//       (errors.message.includes('Maximum call stack size exceeded') ||
//         errors.message.includes('too much recursion'))
//     )
//       throw new Error('RangeError: Maximum call stack size exceeded')
//     const temp = dfs(args)
//     if (temp.fn || temp.res)
//       throw new Error(
//         errors +
//           ' ( near ' +
//           (temp.res.type === 'value'
//             ? temp.res.value
//             : temp.res.name ?? 'null') +
//           (temp.fn ? ' in function ' + temp.fn + ' )  ' : ' )')
//       )
//     else throw new Error(errors)
//   }
// }
export const runFromText = source => run(removeNoCode(source))

export const exe = source => {
  const ENV = protolessModule(STD)
  ENV[';;tokens'] = protolessModule(tokens)
  const { result } = cell(ENV)(wrapInBody(source))
  return result
}
export const addSpace = str => str + '\n'
export const isBalancedParenthesis = sourceCode => {
  let count = 0
  const stack = []
  const str = sourceCode.replace(/"(.*?)"/g, '')
  const pairs = { ']': '[' }
  for (let i = 0; i < str.length; ++i)
    if (str[i] === '[') stack.push(str[i])
    else if (str[i] in pairs) if (stack.pop() !== pairs[str[i]]) count++
  return { str, diff: count - stack.length }
}
export const handleUnbalancedParens = sourceCode => {
  const parenMatcher = isBalancedParenthesis(sourceCode)
  if (parenMatcher.diff !== 0)
    throw new SyntaxError(
      `Parenthesis are unbalanced by ${parenMatcher.diff > 0 ? '+' : ''}${
        parenMatcher.diff
      } "]"`
    )
}
export const prettier = str =>
  addSpace(
    str
      .replaceAll('];', '];\n')
      .replaceAll(';', '; ')
      .replaceAll('; ;', ';;')
      .replaceAll('[', ' [')
      .replaceAll('|', '| ')
      .replaceAll('| >', '\n|>')
      .replaceAll('.. [', '.. [\n')
      .replaceAll('; :=', ';\n:=')
  )

export const run = source => {
  const sourceCode = removeNoCode(source.toString().trim())
  handleUnbalancedParens(sourceCode)
  return exe(sourceCode)
}

export const dashCommentsToSemiComments = source =>
  source.replaceAll('//', ';;')
export const handleHangingSemi = source => {
  const code = source.trim()
  return code[code.length - 1] === ';' ? code : code + ';'
}

export const treeShake = modules => {
  let LIB = ''
  const dfs = (modules, LIB, LIBRARY) => {
    for (const key in modules) {
      if (key !== 'LIBRARY' && modules[key] !== undefined) {
        LIB += '["' + key + '"]:{'
        for (const method of modules[key]) {
          if (LIBRARY[key]) {
            const current = LIBRARY[key][method]
            if (current) {
              if (typeof current === 'object') {
                LIB += dfs({ [method]: modules[method] }, '', LIBRARY[key])
              } else {
                LIB += '["' + method + '"]:'
                LIB += current.toString()
                LIB += ','
              }
            }
          }
        }
        LIB += '},'
      }
    }
    return LIB
  }
  LIB += 'const LIBRARY = {' + dfs(modules, LIB, STD.LIBRARY) + '}'
  return LIB
}

export const compileModule = source => {
  const inlined = wrapInBody(removeNoCode(source))
  const { body, modules } = compileToJs(parse(inlined))
  const LIB = treeShake(modules)
  return `const VOID = null;
${languageUtilsString}
${LIB}
${body}`
}

export const compileHtml = (source, scripts = '') => {
  const inlined = wrapInBody(removeNoCode(source))
  const { body, modules } = compileToJs(parse(inlined))
  const LIB = treeShake(modules)
  return `
<style>body { background: black } </style><body>
${scripts}
<script>
const VOID = null;
${languageUtilsString}
</script>
<script>${LIB}</script>
<script> (() => { ${body} })()</script>
</body>`
}

export const interpredHtml = (
  source,
  utils = '../language/misc/utils.js',
  scripts = TWO_JS_HTML
) => {
  const inlined = wrapInBody(removeNoCode(source))
  return `<style>body { background: black } </style>
  ${scripts}
<script type="module">
import { exe } from '${utils}'; 
  try { 
    exe('${inlined}') 
  } catch(err) {
    console.error(err.message) 
  }
</script>
</body>`
}

export const generateCompressedModules = (
  abc = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ]
) => {
  const { NAME, ...LIB } = STD.LIBRARY
  const modules = []
  for (const module in LIB)
    for (const m in LIB[module])
      if (m !== 'NAME' && m.length > 4) modules.push(m)
  let index = 0
  let count = 0
  const ratio = (modules.length / abc.length) | 0.5
  return modules
    .sort((a, b) => (a.length > b.length ? -1 : 1))
    .map(full => {
      const short = abc[index] + count
      ++count
      if (count > ratio) {
        ++index
        count = 0
      }
      return { full, short }
    })
}
