///////////////////////////////////////////////////////////////////////////////////
// The MIT License (MIT)
//
// Copyright (c) 2017 Tarek Sherif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
///////////////////////////////////////////////////////////////////////////////////

"use strict";

const CONSTANTS = require("./constants");
const TEXTURE_FORMAT_DEFAULTS = require("./texture-format-defaults");

const DUMMY_ARRAY = new Array(1);

/**
    通用纹理贴图。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLTexture} texture 纹理贴图句柄。
    @prop {WebGLSamler} sampler 采样对象。
    @prop {number} width 贴图宽度。
    @prop {number} height 贴图高度。
    @prop {number} depth 贴图深度。
    @prop {GLEnum} binding 贴图的绑定点。
    @prop {GLEnum} type 贴图数据类型。
    @prop {GLEnum} format 贴图数据布局。
    @prop {GLEnum} internalFormat 贴图数据的内部排列。
    @prop {number} currentUnit 当前绑定到的贴图单元。
    @prop {boolean} is3D 贴图是否包包含 3D 数据。
    @prop {boolean} flipY 贴图的Y坐标是否翻转。
    @prop {boolean} premultiplyAlpha 是否在加载时对贴图的alpha进行预乘。
    @prop {boolean} mipmaps 贴图是否使用 mipmap 过滤（并因此需要一条完整的 mipmap 链）。
    @prop {Object} appState 跟踪的GL状态。
*/
class Texture {
    constructor(gl, appState, binding, image, width = image.width, height = image.height, depth, is3D, options = CONSTANTS.DUMMY_OBJECT) {
        let defaultType = options.format === CONSTANTS.DEPTH_COMPONENT ? CONSTANTS.UNSIGNED_SHORT : CONSTANTS.UNSIGNED_BYTE;

        this.gl = gl;
        this.binding = binding;
        this.texture = null;
        this.width = width || 0;
        this.height = height || 0;
        this.depth = depth || 0;
        this.type = options.type !== undefined ? options.type : defaultType;
        this.is3D = is3D;
        this.appState = appState;

        this.format = null;
        this.internalFormat = null;
        this.compressed = !!(TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[options.format] || TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[options.internalFormat]);
        
        if (this.compressed) {
            // 对于压缩纹理，只需要提供一个 format 和 internalFormat
            this.format = options.format !== undefined ? options.format : options.internalFormat;
            this.internalFormat = options.internalFormat !== undefined ? options.internalFormat : options.format;
        } else {
            this.format = options.format !== undefined ? options.format : gl.RGBA;
            this.internalFormat = options.internalFormat !== undefined ? options.internalFormat : TEXTURE_FORMAT_DEFAULTS[this.type][this.format];
        }

        // -1 代表未约束。
        this.currentUnit = -1;

        // 采样参数
        let {
            minFilter = image ? CONSTANTS.LINEAR_MIPMAP_NEAREST : CONSTANTS.NEAREST,
            magFilter = image ? CONSTANTS.LINEAR : CONSTANTS.NEAREST,
            wrapS = CONSTANTS.REPEAT,
            wrapT = CONSTANTS.REPEAT,
            wrapR = CONSTANTS.REPEAT,
            compareMode = CONSTANTS.NONE,
            compareFunc = CONSTANTS.LEQUAL,
            minLOD = null,
            maxLOD = null,
            baseLevel = null,
            maxLevel = null,
            flipY = false,
            premultiplyAlpha = false
        } = options;

        this.minFilter = minFilter;
        this.magFilter = magFilter;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.wrapR = wrapR;
        this.compareMode = compareMode;
        this.compareFunc = compareFunc;
        this.minLOD = minLOD;
        this.maxLOD = maxLOD;
        this.baseLevel = baseLevel;
        this.maxLevel = maxLevel;
        this.flipY = flipY;
        this.premultiplyAlpha = premultiplyAlpha;
        this.mipmaps = (minFilter === CONSTANTS.LINEAR_MIPMAP_NEAREST || minFilter === CONSTANTS.LINEAR_MIPMAP_LINEAR);

        this.restore(image);
    }

    /**
        在上下文丢失后恢复贴图。

        @method
        @param {DOMElement|ArrayBufferView|Array} [image] 图像数据。 可以传入一个数组设定所有等级的 mipmap 链。如果启
            用 mipmap 过滤后只传入了单一的等级，将会调用 generateMipmap() 生成其余等级的 mipmap 。
        @return {Texture} 贴图对象。
    */
    restore(image) {
        this.texture = null;
        this.resize(this.width, this.height, this.depth);

        if (image) {
            this.data(image);
        }

        return this;
    }

    /**
        重新分配贴图存储空间。

        @method
        @param {number} width 图像宽度。
        @param {number} height 图像高度。
        @param {number} [depth] 图像深度或数量。在传递 3D 贴图或贴图数组数据时需要。
        @return {Texture} 贴图对象。
    */
    resize(width, height, depth) {
        depth = depth || 0;

        if (this.texture && width === this.width && height === this.height && depth === this.depth) {
            return this; 
        }

        this.gl.deleteTexture(this.texture);
        if (this.currentUnit !== -1) {
            this.appState.textures[this.currentUnit] = null;
        }

        this.texture = this.gl.createTexture();
        this.bind(Math.max(this.currentUnit, 0));

        this.width = width;
        this.height = height;
        this.depth = depth;

        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_MIN_FILTER, this.minFilter);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_MAG_FILTER, this.magFilter);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_WRAP_S, this.wrapS);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_WRAP_T, this.wrapT);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_WRAP_R, this.wrapR);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_COMPARE_FUNC, this.compareFunc);
        this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_COMPARE_MODE, this.compareMode);
        this.gl.pixelStorei(CONSTANTS.UNPACK_FLIP_Y_WEBGL, this.flipY);
        this.gl.pixelStorei(CONSTANTS.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        if (this.minLOD !== null) {
            this.gl.texParameterf(this.binding, CONSTANTS.TEXTURE_MIN_LOD, this.minLOD);
        }
        if (this.maxLOD !== null) {
            this.gl.texParameterf(this.binding, CONSTANTS.TEXTURE_MAX_LOD, this.maxLOD);
        }
        if (this.baseLevel !== null) {
            this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_BASE_LEVEL, this.baseLevel);
        }

        if (this.maxLevel !== null) {
            this.gl.texParameteri(this.binding, CONSTANTS.TEXTURE_MAX_LEVEL, this.maxLevel);
        }

        let levels;
        if (this.is3D) {
            if (this.mipmaps) {
                levels = Math.floor(Math.log2(Math.max(Math.max(this.width, this.height), this.depth))) + 1;
            } else {
                levels = 1;
            }
            this.gl.texStorage3D(this.binding, levels, this.internalFormat, this.width, this.height, this.depth);
        } else {
            if (this.mipmaps) {
                levels = Math.floor(Math.log2(Math.max(this.width, this.height))) + 1;
            } else {
                levels = 1;
            }
            this.gl.texStorage2D(this.binding, levels, this.internalFormat, this.width, this.height);
        }

        return this;
    }

    /**
        设定贴图的图像数据。可以传入一个数组设定所有等级的 mipmap 链。如果启
        用 mipmap 过滤后只传入了单一的等级，将会调用 generateMipmap() 生成
        其余等级的 mipmap 。注意：数据可能使用当前已经分配的空间！

        @method
        @param {ImageElement|ArrayBufferView|Array} data 图像数据。如果传入数组，数据将会用来设定 mipmap 等级。
        @return {Texture} 贴图对象。
    */
    data(data) {
        if (!Array.isArray(data)) {
            DUMMY_ARRAY[0] = data;
            data = DUMMY_ARRAY;
        }

        let numLevels = this.mipmaps ? data.length : 1;
        let width = this.width;
        let height = this.height;
        let depth = this.depth;
        let generateMipmaps = this.mipmaps && data.length === 1;
        let i;

        this.bind(Math.max(this.currentUnit, 0));

        if (this.compressed) {
            if (this.is3D) {
                for (i = 0; i < numLevels; ++i) {
                    this.gl.compressedTexSubImage3D(this.binding, i, 0, 0, 0, width, height, depth, this.format, data[i]);
                    width = Math.max(width >> 1, 1);
                    height = Math.max(height >> 1, 1);
                    depth = Math.max(depth >> 1, 1);
                }
            } else {
                for (i = 0; i < numLevels; ++i) {
                    this.gl.compressedTexSubImage2D(this.binding, i, 0, 0, width, height, this.format, data[i]);
                    width = Math.max(width >> 1, 1);
                    height = Math.max(height >> 1, 1);
                }
            }
        } else if (this.is3D) {
            for (i = 0; i < numLevels; ++i) {
                this.gl.texSubImage3D(this.binding, i, 0, 0, 0, width, height, depth, this.format, this.type, data[i]);
                width = Math.max(width >> 1, 1);
                height = Math.max(height >> 1, 1);
                depth = Math.max(depth >> 1, 1);
            }
        } else {
            for (i = 0; i < numLevels; ++i) {
                this.gl.texSubImage2D(this.binding, i, 0, 0, width, height, this.format, this.type, data[i]);
                width = Math.max(width >> 1, 1);
                height = Math.max(height >> 1, 1);
            }
        }

        if (generateMipmaps) {
            this.gl.generateMipmap(this.binding);
        }

        return this;
    }

    /**
        删除这个贴图。

        @method
        @return {Texture} 贴图对象。
    */
    delete() {
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null;

            if (this.currentUnit !== -1 && this.appState.textures[this.currentUnit] === this) {
                this.appState.textures[this.currentUnit] = null;
                this.currentUnit = -1;
            }
        }

        return this;
    }

    /**
        将这个贴图绑定到贴图单元。

        @method
        @ignore
        @return {Texture} 贴图对象。
    */
    bind(unit) {
        let currentTexture = this.appState.textures[unit];
        
        if (currentTexture !== this) {
            if (currentTexture) {
                currentTexture.currentUnit = -1;
            }

            if (this.currentUnit !== -1) {
                this.appState.textures[this.currentUnit] = null;
            }

            this.gl.activeTexture(CONSTANTS.TEXTURE0 + unit);
            this.gl.bindTexture(this.binding, this.texture);

            this.appState.textures[unit] = this;
            this.currentUnit = unit;
        }

        return this;
    }

}

module.exports = Texture;
