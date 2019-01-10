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

/**
    用于环境映射的立方体贴图（Cubemap）。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLTexture} texture 贴图句柄。
    @prop {GLEnum} type 贴图中存储的数据类型。
    @prop {GLEnum} format 贴图数据布局。
    @prop {GLEnum} internalFormat 贴图数据内部排列。
    @prop {Number} currentUnit 当前 Cubemap 绑定到的贴图单元。
    @prop {boolean} flipY 当前 Cubemap 的Y坐标是否翻转。
    @prop {boolean} premultiplyAlpha 加载 Cubemap 时是否需要预乘 alpha。
    @prop {Object} appState 跟踪的GL状态。
*/
class Cubemap {

    constructor(gl, appState, options) {
        let defaultType = options.format === CONSTANTS.DEPTH_COMPONENT ? CONSTANTS.UNSIGNED_SHORT : CONSTANTS.UNSIGNED_BYTE;

        this.gl = gl;
        this.texture = null;
        this.format = options.format !== undefined ? options.format : CONSTANTS.RGBA;
        this.type = options.type !== undefined ? options.type : defaultType;
        this.internalFormat = options.internalFormat !== undefined ? options.internalFormat : TEXTURE_FORMAT_DEFAULTS[this.type][this.format];
        this.appState = appState;
        
        // -1 代表无约束
        this.currentUnit = -1;

        let negX = options.negX;
        let {
            width = negX.width,
            height = negX.height,
            flipY = false,
            premultiplyAlpha = false,
            minFilter = negX ? CONSTANTS.LINEAR_MIPMAP_NEAREST : CONSTANTS.NEAREST,
            magFilter = negX ? CONSTANTS.LINEAR : CONSTANTS.NEAREST,
            wrapS = CONSTANTS.REPEAT,
            wrapT = CONSTANTS.REPEAT,
            compareMode = CONSTANTS.NONE,
            compareFunc = CONSTANTS.LEQUAL,
            minLOD = null,
            maxLOD = null,
            baseLevel = null,
            maxLevel = null
        } = options;
        
        this.width = width;
        this.height = height;
        this.flipY = flipY;
        this.premultiplyAlpha = premultiplyAlpha;
        this.minFilter = minFilter;
        this.magFilter = magFilter;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.compareMode = compareMode;
        this.compareFunc = compareFunc;
        this.minLOD = minLOD;
        this.maxLOD = maxLOD;
        this.baseLevel = baseLevel;
        this.maxLevel = maxLevel;
        this.mipmaps = (minFilter === CONSTANTS.LINEAR_MIPMAP_NEAREST || minFilter === CONSTANTS.LINEAR_MIPMAP_LINEAR);
        this.levels = this.mipmaps ? Math.floor(Math.log2(Math.min(this.width, this.height))) + 1 : 1;

        this.restore(options);
    }

    /**
        在上下文丢失后恢复 Cubemap。

        @method
        @param {Object} [options] 贴图选项。
        @param {DOMElement|ArrayBufferView} [options.negX] 负X方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posX] 正X方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.negY] 负Y方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posY] 正Y方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.negZ] 负Z方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posZ] 正Z方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @return {Cubemap} Cubemap 对象。
    */
    restore(options = CONSTANTS.DUMMY_OBJECT) {
        this.texture = this.gl.createTexture();

        if (this.currentUnit !== -1) {
            this.appState.textures[this.currentUnit] = null;
        }

        this.bind(0);
        this.gl.pixelStorei(CONSTANTS.UNPACK_FLIP_Y_WEBGL, this.flipY);
        this.gl.pixelStorei(CONSTANTS.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_MAG_FILTER, this.magFilter);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_MIN_FILTER, this.minFilter);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_WRAP_S, this.wrapS);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_WRAP_T, this.wrapT);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_COMPARE_FUNC, this.compareFunc);
        this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_COMPARE_MODE, this.compareMode);
        if (this.baseLevel !== null) {
            this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_BASE_LEVEL, this.baseLevel);
        }
        if (this.maxLevel !== null) {
            this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_MAX_LEVEL, this.maxLevel);
        }
        if (this.minLOD !== null) {
            this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_MIN_LOD, this.minLOD);
        }
        if (this.maxLOD !== null) {
            this.gl.texParameteri(CONSTANTS.TEXTURE_CUBE_MAP, CONSTANTS.TEXTURE_MAX_LOD, this.maxLOD);
        }

        this.gl.texStorage2D(CONSTANTS.TEXTURE_CUBE_MAP, this.levels, this.internalFormat, this.width, this.height);

        let { negX, posX, negY, posY, negZ, posZ } = options;

        if (negX) {
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, 0, 0, this.width, this.height, this.format, this.type, negX);
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_POSITIVE_X, 0, 0, 0, this.width, this.height, this.format, this.type, posX);
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, 0, 0, this.width, this.height, this.format, this.type, negY);
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, 0, 0, this.width, this.height, this.format, this.type, posY);
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, 0, 0, this.width, this.height, this.format, this.type, negZ);
            this.gl.texSubImage2D(CONSTANTS.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, 0, 0, this.width, this.height, this.format, this.type, posZ);
        }

        if (this.mipmaps) {
            this.gl.generateMipmap(CONSTANTS.TEXTURE_CUBE_MAP);
        }

        return this;
    }

    /**
        删除这个 Cubemap。

        @method
        @return {Cubemap} Cubemap 对象。
    */
    delete() {
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null;
            this.appState.textures[this.currentUnit] = null;
            this.currentUnit = -1;
        }

        return this;
    }

    /**
        将这个Cubemap对象绑定到贴图单元。

        @method
        @ignore
        @return {Cubemap} Cubemap 对象。
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
            this.gl.bindTexture(CONSTANTS.TEXTURE_CUBE_MAP, this.texture);

            this.appState.textures[unit] = this;
            this.currentUnit = unit;
        }

        return this;
    }

}

module.exports = Cubemap;
