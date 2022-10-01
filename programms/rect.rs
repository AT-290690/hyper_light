<- ["SKETCH"; "MATH"; "CONSOLE"] [LIBRARY];
<- ["make scene"; "setlinewidth"; "set rotation"; "set position"; "no fill"; "set fill"; "set stroke";  "update"; "background"; "make rectangle"; "width"; "height"] [SKETCH];

make scene [300; 300; -> [..[
  background["black"];
  |> [
    make rectangle [width[0.5]; height[0.5]; width [1]; height [1]];
    | no fill [];
    | setlinewidth [10];
    | set stroke ["crimson"]  
    ];
  |> [
    make rectangle [1; 1; 25; 25];
    | set position [width [0.5]; height [0.5]];
    | set fill ["crimson"];
    | set rotation [1.2]
  ];
  update []]]]
