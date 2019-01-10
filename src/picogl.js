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

let webglInfoInitialized = false;

const App = require("./app");

/**
    全局 PicoGL 模块。方便起见，所有 WebGL 枚举都作为 PicoGL 的属性存储
    （例如：PicoGL.FLOAT, PicoGL.ONE_MINUS_SRC_ALPHA）。

    @namespace PicoGL
*/
const PicoGL = require("./constants");
PicoGL.version = "%%VERSION%%";

/**
    创建一个 PicoGL 应用程序。这个应用程序是 PicoGL 的主要入口。它存储
    了 canvas、WebGL 上下文以及所有的 WebGL 状态。

    @function PicoGL.createApp
    @param {DOMElement} canvas 用来创建 WebGL 上下文的 canvas。
    @param {Object} [contextAttributes] 传递给 getContext() 的上下文属性。
    @return {App} 新的应用程序对象。
*/
PicoGL.createApp = function(canvas, contextAttributes) {
    let gl = canvas.getContext("webgl2", contextAttributes);
    if (!webglInfoInitialized) {
        PicoGL.WEBGL_INFO.MAX_TEXTURE_UNITS = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        PicoGL.WEBGL_INFO.MAX_UNIFORM_BUFFERS = gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS);
        PicoGL.WEBGL_INFO.SAMPLES = gl.getParameter(gl.SAMPLES);
        webglInfoInitialized = true;      
    }
    return new App(gl, canvas);
};
    
module.exports = PicoGL;
