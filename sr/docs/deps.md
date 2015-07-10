# Dependencies

Covering the key dependencies that we tend to update in chains:

    digraph deps {
        { rank=same; hapi gulp };
        "hapi-anode" -> "hapi-bench-test";
        "hapi-anode" -> gulp [style=dotted]; // uses
        "hapi-anode" -> hapi [style=dashed]; // peerDep
        "hapi-anode" -> yar;
        "hapi-anode" -> microbrowsery;
        "hapi-bench-test" -> hapi [style=dashed]; // peerDep
        gulp [shape=box];
        gulpex -> gulp [style=dotted]; // integrates
        "gulp-down" -> gulp [style=dotted]; // integrates
        gulpex -> gulpex;
        hapi [shape=box];
        sr -> "gulp-down";
        sr -> "hapi-anode";
        sr -> "hapi-bench-test";
        sr -> gulp [style=dotted]; // uses
        sr -> gulpex [style=dotted]; // uses
        sr -> hapi [style=dashed]; // peerDep
        sr -> yar;
    }

Feed that through `dot -Tpng` to get a picture.
