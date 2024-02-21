function vecToYaf(vector) {
    let i = 0;
    let result = "\"";
    for (; (i + 1) < vector.length; i++) {
        result += vector[i];
        result += ' ';
    }
    if (i < vector.length) {
        result += vector[i];
    }
    result += "\"";
    return result;
}
var prettifyXml = function (sourceXml) {
    // Thanks to:  https://stackoverflow.com/questions/376373/pretty-printing-xml-with-javascript
    var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
    var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
    ].join('\n'), 'application/xml');

    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    var resultXml = new XMLSerializer().serializeToString(resultDoc);
    return resultXml;
}

function attributesToString(attributes) {
    let result = "";
    for (let key in attributes) {
        let value = attributes[key];
        let valueString = "";
        if (value == null || value == undefined) {
            continue;
        }
        if (Array.isArray(value)) {
            valueString = vecToYaf(value);
        }
        else if (value instanceof Vec3) {
            valueString = vecToYaf([value.x, value.y, value.z]);
        }
        else {
            valueString = "\"" + value + "\"";
        }
        result += key + "=" + valueString + " ";
    }
    return result;
}


function complexTag(name, attributes, childName, children) {
    let result = "<" + name + " ";
    result += attributesToString(attributes);
    result += ">";
    for (const child of children) {
        result += singleTag(childName, child);
    }
    result += "</" + name + ">";
    return result;


}

function singleTag(name, attributes) {
    let result = "<" + name + " ";
    result += attributesToString(attributes);
    result += "/>";
    return result;
}


export class Scene {
    constructor() {
        this.globals = { background: [0, 0, 0, 1], ambient: [0, 0, 0, 1] };
        this.envs = [];
        this.fog = { color: [0.1, 0.13, 0.1, 1], near: 100, far: 300 };
        this.cameras = [];
        this.children = [];
        this.narrowDistance = 100;
        this.skybox = {
            size: [2000, 2000, 2000], center: [0, 0, 0], emissive: [0.6, 0.6, 0.6, 1], intensity: 0.4,
            front: "projects/racingGame/textures/asgard_front.png",
            back: "projects/racingGame/textures/asgard_back.png",
            up: "projects/racingGame/textures/asgard_top.png",
            down: "projects/racingGame/textures/asgard_bottom.png",
            right: "projects/racingGame/textures/asgard_left.png",
            left: "projects/racingGame/textures/asgard_right.png"
        };


        this.textures = new Map();
        this.materials = new Map();
        this.shaders = new Map();
        this.nodes = new Map();
        this.huds = [];


        this.root = { id: 10 };
        this.initialCamera = null;
    }
    listToString(tagName, list, params) {
        let result = "<" + tagName + " " + attributesToString(params) + ">";
        for (const element of list) {
            result += element.toString();
        }
        result += "</" + tagName + ">";
        return result;
    }
    yafxCredits() {
        return "<!-- Powered By YAFX -->";
    }
    add(...nodes) {
        for (const node of nodes) {
            this.children.push(node);
        }
    }

    visitNode(node) {
        this.nodes.set(node.id, node);
        if (node.material) {
            if (node.material instanceof Shader) {
                this.shaders.set(node.material.id, node.material);
            }
            else this.materials.set(node.material.id, node.material);
            if (node.material.texture) {
                this.textures.set(node.material.texture.id, node.material.texture);
            }
            if (node.material.specularMap) {
                this.textures.set(node.material.specularMap.id, node.material.specularMap);
            }
            if (node.material.bumpTexture) {
                this.textures.set(node.material.bumpTexture.id, node.material.bumpTexture);

            }
        }
    }
    flattenChildren(children) {
        for (const child of children) {
            if (child instanceof Node) {
                this.visitNode(child);
                if (child.children.length > 0) {
                    this.flattenChildren(child.children);
                }
            }

            if (child instanceof HUD) {
                if (child.children.length > 0) {
                    this.flattenChildren(child.children);
                }
            }

            if (child instanceof Lod) {
                this.nodes.set(child.id, child);
                const lodChildren = [];
                for (const [level, minDist] of child.levels) {
                    lodChildren.push(level);
                }
                this.flattenChildren(lodChildren);

            }
        }
    }

    toString() {

        this.flattenChildren(this.children);
        this.flattenChildren(this.huds);
        let result = `<?xml version="1.0" encoding="UTF-16" standalone="yes"?><yaf>`
        result += this.yafxCredits();
        result += singleTag("skybox", this.skybox);
        result += singleTag("globals", this.globals);
        result += this.listToString("envs", this.envs);

        result += singleTag("fog", this.fog);
        result += this.listToString("huds", this.huds);

        result += this.listToString("cameras", this.cameras, { initial: this.initialCamera.id });
        result += this.listToString("textures", this.textures.values());
        result += this.listToString("materials", this.materials.values());
        result += this.listToString("shaders", this.shaders.values());

        result += `<graph rootid="${this.root.id}" narrowDistance="${this.narrowDistance}">`;

        for (const node of this.nodes.values()) {
            result += node.toString();

        }

        result += "</graph>";
        result += "</yaf>";
        return prettifyXml(result);
    }
}

class InstanceCounter {
    static current = 0;
    static total = 0;
    constructor(buildId) {
        this.constructor.total++;
        if (!buildId) {
            this.id = this.nextId();
        }
        else {
            this.id = buildId;
        }
    }
    nextCounter() {
        let val = this.constructor.current;
        this.constructor.current++;
        return val;
    }
    defaultId(id) {
        return toString(id);
    }
    nextId() {
        return this.defaultId(this.nextCounter());
    }
}

// TODO create a better vector with an easier API
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
function areEqual(v, x, y, z) {
    return (v.x == x && v.y == y && v.z == z);

}
function positionDefault(v) {
    return areEqual(v, 0, 0, 0);
}
function rotateDefault(v) {
    return areEqual(v, 0, 0, 0);
}
function scaleDefault(v) {
    return areEqual(v, 1, 1, 1);
}

export class Node extends InstanceCounter {
    constructor(id = null) {
        super(id);
        this.children = [];
        this.positions = [];
        this.rotations = [];
        this.scales = [];
        this.material = null;
        this.alias = null;
        this.body = null;
        this.visible = true;
        this.controller = null;
        this.layers = [];
        this.castshadows = false
        this.receiveshadows = true
        this.position = new Vec3(0, 0, 0);
        this.scale = new Vec3(1, 1, 1);
        this.rotation = new Vec3(0, 0, 0);
    }
    defaultId(id) {
        return "node-yafx-" + id;
    }
    toString() {
        let u = `<node id="${this.id}" castshadows="${this.castshadows}" receiveshadows="${this.receiveshadows}" controller="${this.controller}" visible="${this.visible}">
       ${this.material ? this.material.getRef() : ""}
       ${this.body ? this.body.toString() : ""}
       ${this.transformsToString()}
       ${this.childrenToString()}
       ${this.layersToString()}
       </node>
       `
        return u;
    }
    transformsToString() {
        // gather transforms
        const transformations = this.getTransforms();
        if (transformations.length == 0) {
            return "";
        }
        let result = "<transforms>"
        for (const transformation of transformations) {
            result += transformation;
        }
        result += "</transforms>";
        return result;
    }
    getTransforms() {
        const transforms = [];
        if (!positionDefault(this.position)) {
            transforms.push(singleTag("translate", { value3: this.position }));
        }
        if (!scaleDefault(this.scale)) {
            transforms.push(singleTag("scale", { value3: this.scale }));
        }
        if (!rotateDefault(this.rotation)) {
            const degToRad = deg => Math.PI * deg / 180;
            const rotationInRads = [
                degToRad(this.rotation.x),
                degToRad(this.rotation.y),
                degToRad(this.rotation.z),
            ];

            transforms.push(singleTag("rotate", { value3: rotationInRads }));
        }
        return transforms;

    }

    layersToString() {
        if (this.layers.length == 0) {
            return "";
        }
        let result = "<layers>"
        for (const layer of this.layers) {
            result += `<layer id = "${layer}"/>`;
        }
        result += "</layers>";
        return result;
    }

    childrenToString() {
        if (this.children.length == 0) {
            return "";
        }
        let result = "<children>"
        for (const child of this.children) {
            if (child instanceof Node || child instanceof Lod) {
                result += child.getRef();
            }
            else {
                result += child.toString();
            }
        }
        result += "</children>";
        return result;
    }
    getRef(params = {}) {
        return singleTag("noderef", { id: this.id, alias: this.alias, ...params });

    }
    add(...nodes) {
        for (const node of nodes) {
            this.children.push(node);

        }
    }
}

export class Texture extends InstanceCounter {
    constructor(filePath, id = null) {
        super(id);
        this.filePath = filePath;
        this.mipmaps = [];
        this.generateMipMaps = true;
    }

    toString() {
        const mipmapsObject = {};
        for (let i = 0; i < this.mipmaps.length; i++) {
            const mipmapI = "mipmap" + i;
            mipmapsObject[mipmapI] = this.mipmaps[i];

        }
        return singleTag("texture", { id: this.id, filepath: this.filePath, mipmaps: this.generateMipMaps, ...mipmapsObject });
    }
    defaultId(id) {
        return "texture-yafx-" + id;
    }

}




export class Lod extends InstanceCounter {
    constructor(id = null) {
        super(id);
        this.levels = [];
    }

    addLevel(node, minDistance) {
        this.levels.push([node, minDistance]);
    }

    defaultId(id) {
        return "lod-yafx-" + id;
    }
    getRef(params = {}) {
        return singleTag("lodref", { id: this.id });
    }
    toString() {
        let res = `<lod id="${this.id}">`
        for (const [object, minDist] of this.levels) {
            if (object instanceof Node) {
                res += object.getRef({ mindist: minDist });
            }
        }
        res += "</lod>"
        return res;
    }
}

export class Env extends InstanceCounter {
    constructor(id = null, { type = "none", value = "none" }) {
        super(id);
        this.type = type;
        this.value = value;
    }

    defaultId(id) {
        return "env-yafx-" + id;
    }
    toString() {
        return singleTag("env", { id: this.id, type: this.type, value: this.value });
    }
}


export class Shader extends InstanceCounter {
    constructor({ vert, frag, id = null }) {
        super(id);
        this.vert = vert;
        this.frag = frag;
        this.children = [];

    }
    defaultId(id) {
        return "shader-yafx-" + id;
    }
    toString() {
        return complexTag("shader", { id: this.id, vertref: this.vert, fragref: this.frag }, "uniform", this.children);
    }

    getRef() {
        return singleTag("materialref", { id: this.id });
    }
}

export class HUD extends InstanceCounter {
    constructor(id = null) {
        super(id);
        this.children = [];

    }
    defaultId(id) {
        return "hud-yafx-" + id;
    }

    add(...nodes) {

        for (const node of nodes) {
            this.children.push(node);
        }
    }

    childrenToString() {
        if (this.children.length == 0) {
            return "";
        }
        let result = "<children>"
        for (const child of this.children) {
            if (child instanceof Node || child instanceof Lod) {
                result += child.getRef();
            }
            else {
                result += child.toString();
            }
        }
        result += "</children>";
        return result;
    }

    toString() {

        let u = `<hud id="${this.id}">
        ${this.childrenToString()}
        </hud>
        `
        return u;

    }

}

export class Body extends InstanceCounter {
    constructor(

        type = "kinematic",
        collider = "ball",
        size = [1, 1, 1],
        id = null
    ) {
        super(id);
        this.type = type;
        this.collider = collider;
        this.size = size
    }

    defaultId(id) {
        return "body-yafx-" + id;
    }
    toString() {
        return singleTag("body", {
            id: this.id,
            type: this.type,
            collider: this.collider,
            size: this.size,
        })
    }
}


export class Material extends InstanceCounter {
    constructor(
        {
            emissive = [0.0, 0.0, 0.0, 1],
            color = [0.0, 0.0, 0.0, 1],
            specular = [0.0, 0.0, 0.0, 1],
            shininess = 0,
            texture = null,
            texLengthS = 1,
            texLengthT = 1,
            twoSided = false,
            wireFrame = false,
            specularMap = null,
            bumpTexture = null,
            bumpScale = 1,
        }, id = null) {
        super(id);
        this.emissive = emissive;
        this.color = color;
        this.specular = specular;
        this.shininess = shininess;
        this.texture = texture;
        this.specularMap = specularMap;
        this.texLengthS = texLengthS;
        this.texLengthT = texLengthT;
        this.twoSided = twoSided;
        this.specularMap = specularMap;
        this.bumpTexture = bumpTexture
        this.bumpScale = bumpScale;
        this.wireFrame = wireFrame;
    }
    defaultId(id) {
        return "material-yafx-" + id;
    }
    toString() {
        return singleTag("material", {
            id: this.id,
            emissive: this.emissive,
            color: this.color,
            specular: this.specular,
            shininess: this.shininess,
            textureref: this.texture ? this.texture.id : null,
            specularref: this.specularMap ? this.specularMap.id : null,
            texlength_s: this.texLengthS,
            texlength_t: this.texLengthT,
            twosided: this.twoSided,
            bumpref: this.bumpTexture ? this.bumpTexture.id : null,
            bumpscale: this.bumpScale,
            wireframe: this.wireFrame,
        })
    }
    getRef() {
        return singleTag("materialref", { id: this.id });
    }
}
export class PrimitiveNode extends Node {
    constructor(primitive, id = null) {
        super(id);
        this.primitive = primitive;
    }
    childrenToString() {
        return "<children><primitive>" + this.primitive.toString() + "</primitive></children>";
    }
}

export class ParticlePrimitive {
    constructor(start, finish, loop, velocity, color) {
        this.start = start;
        this.finish = finish;
        this.velocity = velocity;
        this.loop = loop;
        this.color = color;
    }
    toString() {
        return singleTag("particle", {
            start: this.start,
            finish: this.finish,
            velocity: this.velocity,
            loop: this.loop,
            color: this.color,
        })
    }
}

export class Particle extends PrimitiveNode {
    static LOOP = {
        FOREVER: "forever",
        ONCE: "once",
        TIMES: (n) => n
    };
    constructor({ start = [], finish = [], loop = "forever", velocity = 3, color = [1, 1, 1, 1] } = {}, id = null) {
        super(new ParticlePrimitive(
            start, finish, loop, velocity, color
        ), id);
    }
    defaultId(id) {
        return "particle-yafx-" + id;
    }

}
export class Model3DPrimitive {
    constructor(filePath, distance) {
        this.filePath = filePath;
        this.distance = distance;
    }
    toString() {
        return singleTag("model3d", { filepath: this.filePath, distance: this.distance });
    }

}

export class Model3D extends PrimitiveNode {
    constructor(filePath, distance, id = null) {
        super(new Model3DPrimitive(filePath, distance), id);
    }
    defaultId(id) {
        return "model3d-yafx-" + id;
    }
}


export class TextPrimitive {
    constructor({ content = "yafx", font = "", bg = [0, 0, 0], color = [1, 1, 1], fit = "max", width = "", fontSize = 10 } = {}) {
        this.content = content;
        this.font = font;
        this.bg = bg;
        this.color = color;
        this.fit = fit;
        this.width = width;
        this.fontSize = fontSize;
    }
    toString() {
        return singleTag("text", {
            content: this.content,
            font: this.font,
            bg: this.bg,
            color: this.color,
            fit: this.fit,
            width: this.width,
            fontSize: this.fontSize,
        });
    }
}
export class Text extends PrimitiveNode {
    constructor(params = {}, id = null) {
        super(new TextPrimitive(params), id);
    }
    defaultId(id) {
        return "text-yafx-" + id;
    }
}
export class RectanglePrimitive {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    toString() {
        const p1 = [-this.width / 2, -this.height / 2];
        const p2 = [-p1[0], -p1[0]];
        return singleTag("rectangle", { xy1: p1, xy2: p2 });
    }
}
export class Rectangle extends PrimitiveNode {
    constructor(width = 1, height = 1, id = null) {
        super(new RectanglePrimitive(width, height), id);
    }
    defaultId(id) {
        return "rectangle-yafx-" + id;
    }

}

export class BoxPrimitive {
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
    toString() {
        const p1 = [-this.width / 2, -this.height / 2, -this.depth / 2];
        const p2 = [-p1[0], -p1[1], -p1[2]];
        return singleTag("box", { xyz1: p1, xyz2: p2 });
    }
}
export class Box extends PrimitiveNode {
    constructor(width, height, depth, id = null) {
        super(new BoxPrimitive(width, height, depth), id);

    }
    defaultId(id) {
        return "box-yafx-" + id;
    }
}

export class TrianglePrimitive {
    constructor(p1, p2, p3) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }
    toString() {
        return singleTag("triangle", { xyz1: this.p1, xyz2: this.p2, xyz3: this.p3 });
    }

}

export class Triangle extends PrimitiveNode {
    constructor(p1, p2, p3, id = null) {
        super(new TrianglePrimitive(p1, p2, p3), id);
    }
    defaultId(id) {
        return "triangle-yafx" + id;
    }
}

export class CylinderPrimitive {
    constructor({ base = 1, top = 1, height = 1, slices = 10, stacks = 12, capsclose = false, thetaStart = 0, thetaLength = 0 } = {}) {
        this.base = base;
        this.top = top;
        this.height = height;
        this.slices = slices;
        this.stacks = stacks;
        this.capsclose = capsclose;
        this.thetaStart = thetaStart;
        this.thetaLength = thetaLength;
    }
    toString() {
        return singleTag("cylinder", {
            base: this.base,
            top: this.top,
            height: this.height,
            slices: this.slices,
            stacks: this.stacks,
            capsclose: this.capsclose,
            thetastart: this.thetaStart,
            thetalength: this.thetaLength,
        });
    }

}
export class Cylinder extends PrimitiveNode {
    constructor(cylinderParams, id = null) {
        super(new CylinderPrimitive(cylinderParams), id);
    }
    defaultId(id) {
        return "cylinder-yafx" + id;
    }
}

export class SpherePrimitive {
    constructor({
        radius = 1,
        slices = 50,
        stacks = 50,
        thetaStart,
        thetaLength,
        phiStart,
        phiLength,
    } = {}) {
        this.radius = radius;
        this.slices = slices;
        this.stacks = stacks;
        this.thetaStart = thetaStart;
        this.thetaLength = thetaLength;
        this.phiStart = phiStart;
        this.phiLength = phiLength;
    }
    toString() {
        return singleTag("sphere", {
            radius: this.radius,
            slices: this.slices,
            stacks: this.stacks,
            thetastart: this.thetaStart,
            thetalength: this.thetaLength,
            phistart: this.phiStart,
            philength: this.phiLength,
        })
    }
}
export class Sphere extends PrimitiveNode {
    constructor(sphereParams, id = null) {
        super(new SpherePrimitive(sphereParams), id);
    }
    defaultId(id) {
        return "sphere-yafx-" + id;
    }
}

export class PolygonPrimitive {
    constructor(slices, stacks, radius, colorCenter, colorPerifery) {
        this.radius = radius;
        this.slices = slices;
        this.stacks = stacks;
        this.colorCenter = colorCenter;
        this.colorPerifery = colorPerifery;
    }
    toString() {
        return singleTag("polygon", {
            radius: this.radius,
            slices: this.slices,
            stacks: this.stacks,
            color_c: this.colorCenter,
            color_p: this.colorPerifery,
        })
    }
}
export class Polygon extends PrimitiveNode {
    constructor(slices, stacks, radius, colorCenter, colorPerifery) {
        super(new PolygonPrimitive(slices, stacks, radius, colorCenter, colorPerifery));

    }
    defaultId(id) {
        return "polygon-yafx-" + id;
    }
}

class NurbsPrimitive {
    constructor({
        degreeU = 1,
        degreeV = 1,
        partsU = 20,
        partsV = 20,
        distance = 0,
        controlPoints = [
            { xx: 0, yy: 0, zz: 0 },
            { xx: 0, yy: 0, zz: 1 },
            { xx: 1, yy: 0, zz: 0 },
            { xx: 1, yy: 0, zz: 1 }
        ],
    } = {}) {
        this.degreeU = degreeU;
        this.degreeV = degreeV;
        this.partsU = partsU;
        this.partsV = partsV;
        this.distance = distance;
        this.controlPoints = controlPoints
    }

    toString() {
        return complexTag("nurbs", {
            degree_u: this.degreeU,
            degree_v: this.degreeV,
            parts_u: this.partsU,
            parts_v: this.partsV,
            distance: this.distance,
        }, "controlpoint", this.controlPoints)
    }
}
export class Nurbs extends PrimitiveNode {
    constructor(nurbsParams, id = null) {
        super(new NurbsPrimitive(nurbsParams), id);
    }
    defaultId(id) {
        return "nurbs-yafx-" + id;
    }
}

export class Camera extends InstanceCounter {
    constructor(type, id = null) {
        super(id);
        this.type = type;
        this.position = new Vec3(0, 0, 0);
        this.target = new Vec3(0, 0, 0);
        this.follow = null;
        this.controller = null;
        this.activeHud = null;

    }
    defaultId(id) {
        return this.type + "-camera-yafx-" + id;
    }

}

export class PerspectiveCamera extends Camera {
    constructor({ angle, near, far, target, position, follow }, id = null) {
        super("perspective", id);
        this.angle = angle;
        this.near = near;
        this.far = far;
        this.target = target;
        this.position = position;
        this.follow = follow;

    }
    defaultId(id) {
        return "perspective-camera-yafx-" + id;
    }
    toString() {

        return singleTag(this.type, {
            id: this.id,
            angle: this.angle,
            near: this.near,
            far: this.far,
            location: this.position,
            target: this.target,
            follow: this.follow,
            controller: this.controller,
            activeHud: this.activeHud,
        });
    }
}

export class OrthogonalCamera extends Camera {
    constructor({ near, far, left, right, top, bottom, }, id = null) {
        super("orthogonal", id);
        this.near = near;
        this.far = far;
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.target = new Vec3(0, 0, 0);
    }
    defaultId(id) {
        return "orthogonal-camera-yafx-" + id;
    }
    toString() {

        return singleTag(this.type, {
            id: this.id,
            near: this.near,
            far: this.far,
            left: this.left,
            right: this.right,
            top: this.top,
            bottom: this.bottom,
            location: this.position,
            target: this.target,
            activeHud: this.activeHud,
        });
    }
}
export class LightPrimitive {
    constructor(type, params) {
        this.type = type;
        this.params = params;
    }
    toString() {
        return singleTag(this.type, this.params);
    }
}

export class LightNode extends Node {
    constructor(type, {
        enabled = true,
        castshadow = true,
        color,
        intensity,
    }, id = null) {
        super(id);
        this.type = type;
        this.enabled = enabled;
        this.castshadow = castshadow;
        this.color = color;
        this.intensity = intensity;
        this.shadowmapsize = 4096;
        this.target = new Vec3(0, 0, 0);
    }
    defaultId(id) {
        return "light-node-yafx-" + id;
    }
    defaultParameters() {
        return {
            id: "primitive-" + this.id,
            enabled: this.enabled,
            castshadow: this.castshadow,
            color: this.color,
            intensity: this.intensity,
            shadowmapsize: this.shadowmapsize,
        };
    }
    lightParameters() {
        return this.defaultParameters();
    }
    toString() {
        this.children = [new LightPrimitive(this.type,
            this.lightParameters(),
        )];
        return super.toString();
    }


}
export class PointLight extends LightNode {
    constructor({ enabled = true, castshadow = true,
        color, intensity, distance = 1000, decay = 0 }, id = null) {
        super("pointlight", { enabled, castshadow, color, intensity }, id);
        this.distance = distance;
        this.decay = decay;

    }
    defaultId(id) {
        return "pointlight-node-yafx-" + id;
    }
    lightParameters() {
        const params = this.defaultParameters();
        params.distance = this.distance;
        params.decay = this.decay;
        params.position = this.position;
        return params;
    }
}

export class DirectionalLight extends LightNode {
    constructor({ enabled = true, castshadow = true,
        color, intensity, position = new Vec3(0, 0, 0) }, id = null) {
        super("directionallight", { enabled, castshadow, color, intensity }, id);
        this.position = position;

    }
    defaultId(id) {
        return "directional-node-yafx-" + id;
    }
    lightParameters() {
        const params = this.defaultParameters();
        params.position = this.position;
        return params;
    }

}

export class SpotLight extends LightNode {
    constructor({ enabled = true, castshadow = true,
        color, intensity, angle = 60, penumbra = 0.1, distance = 1000, decay = 0, target = new Vec3(0, 0, 0) }, id = null) {
        super("spotlight", { enabled, castshadow, color, intensity }, id);
        this.angle = angle;
        this.penumbra = penumbra;
        this.distance = distance;
        this.decay = decay;
        this.target = this.target;

    }
    defaultId(id) {
        return "spotlight-node-yafx-" + id;
    }
    lightParameters() {
        const params = this.defaultParameters();
        params.position = this.position;
        params.angle = this.angle;
        params.penumbra = this.penumbra;
        params.distance = this.distance;
        params.decay = this.decay;
        params.target = this.target;
        return params;
    }
}