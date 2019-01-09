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
    WelGL 着色器。

    @class
    @prop {WebGLRenderingContext} gl WelGL 上下文。
    @prop {WebGLShader} shader 着色器。
*/
class Shader {
    
    constructor(gl, type, source) {
        this.gl = gl;
        this.shader = null;
        this.type = type;

        this.restore(source);
    }

    /**
        在上下文丢失后恢复着色器。

        @method
        @param {string} source 包含 glsl 程序代码的字符串。
        @return {Shader} 着色器对象。
    */
    restore(source) {
        this.shader = this.gl.createShader(this.type);
        this.gl.shaderSource(this.shader, source);
        this.gl.compileShader(this.shader);

        if (!this.gl.getShaderParameter(this.shader, CONSTANTS.COMPILE_STATUS)) {
            let i, lines;

            console.error(this.gl.getShaderInfoLog(this.shader));
            lines = source.split("\n");
            for (i = 0; i < lines.length; ++i) {
                console.error(`${i + 1}: ${lines[i]}`);
            }
        }

        return this;
    }

    /**
        删除这个着色器。

        @method
        @return {Shader} 着色器对象。
    */
    delete() {
        if (this.shader) {
            this.gl.deleteShader(this.shader);
            this.shader = null;
        }

        return this;
    }

}

module.exports = Shader;
