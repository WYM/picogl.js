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

/**
    离屏绘图附件。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLRenderbuffer} renderbuffer renderbuffer句柄。
    @prop {number} width Renderbuffer 宽度
    @prop {number} height Renderbuffer 高度。
    @prop {GLEnum} internalFormat RenderBuffer 数据的内部排列。
    @prop {number} samples MSAA 采样数。
*/
class Renderbuffer {
    constructor(gl, width, height, internalFormat, samples = 0) {
        this.gl = gl;
        this.renderbuffer = null;
        this.width = width;
        this.height = height;
        this.internalFormat = internalFormat;
        this.samples = samples;
        this.restore();
    }

    /**
        在上下文丢失后恢复 renderbuffer。

        @method
        @return {Renderbuffer} Renderbuffer 对象。
    */
    restore() {
        this.renderbuffer = this.gl.createRenderbuffer();
        this.resize(this.width, this.height);

        return this;
    }

    /**
        重设 RenderBuffer 大小。

        @method
        @param {number} width renderbuffer 的宽度。
        @param {number} height renderbuffer 的高度。
        @return {Renderbuffer} Renderbuffer 对象。
    */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.gl.bindRenderbuffer(CONSTANTS.RENDERBUFFER, this.renderbuffer);
        this.gl.renderbufferStorageMultisample(CONSTANTS.RENDERBUFFER, this.samples, this.internalFormat, this.width, this.height);
        this.gl.bindRenderbuffer(CONSTANTS.RENDERBUFFER, null);
        
        return this;
    }

    /**
        删除这个 RenderBuffer。

        @method
        @return {Renderbuffer} RenderBuffer 对象。
    */
    delete() {
        this.gl.deleteRenderbuffer(this.renderbuffer);
        this.renderbuffer = null;

        return this;
    }   
}

module.exports = Renderbuffer;