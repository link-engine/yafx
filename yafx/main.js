let yafx = import("./yafx.js").then(m => {
    yafx = m
    console.log("Loaded YAFX module");
    yafx.getXML("../scenes/yafx/test/test.js").then(xml => console.log(xml));
}
);
