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
const Shader = require("./shader");
const Uniforms =  require("./uniforms");

const SingleComponentUniform = Uniforms.SingleComponentUniform;
const MultiNumericUniform = Uniforms.MultiNumericUniform;
const MultiBoolUniform = Uniforms.MultiBoolUniform;
const MatrixUniform = Uniforms.MatrixUniform;

/**
    由已编译链接完成的顶点和片元着色器构成的 WebGL 程序。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLProgram} program WebGL 程序。
    @prop {boolean} transformFeedback 这个程序是否设为变换回传（Transform Feedback）。
    @prop {Object} uniforms uniform 名称与句柄的映射。
    @prop {Object} appState 跟踪的GL状态。
*/
class Program {

    constructor(gl, appState, vsSource, fsSource, xformFeebackVars) {
        this.gl = gl;
        this.appState = appState;
        this.program = null;
        this.transformFeedbackVaryings = xformFeebackVars || null;
        this.uniforms = {};
        this.uniformBlocks = {};
        this.uniformBlockCount = 0;
        this.samplers = {};
        this.samplerCount = 0;

        this.restore(vsSource, fsSource);
    }

    /**
        在上下文丢失后恢复程序。

        @method
        @param {Shader|string} vertexShader 顶点着色器对象或代码。
        @param {Shader|string} fragmentShader 片元着色器对象或源码。
        @return {Program} 程序对象。
    */
    restore(vsSource, fsSource) {
        if (this.appState.program === this) {
            this.gl.useProgram(null);
            this.appState.program = null;
        }

        this.uniformBlockCount = 0;
        this.samplerCount = 0;

        let i;

        let vShader, fShader;

        let ownVertexShader = false;
        let ownFragmentShader = false;
        if (typeof vsSource === "string") {
            vShader = new Shader(this.gl, CONSTANTS.VERTEX_SHADER, vsSource);
            ownVertexShader = true;
        } else {
            vShader = vsSource;
        }

        if (typeof fsSource === "string") {
            fShader = new Shader(this.gl, CONSTANTS.FRAGMENT_SHADER, fsSource);
            ownFragmentShader = true;
        } else {
            fShader = fsSource;
        }

        let program = this.gl.createProgram();
        this.gl.attachShader(program, vShader.shader);
        this.gl.attachShader(program, fShader.shader);
        if (this.transformFeedbackVaryings) {
            this.gl.transformFeedbackVaryings(program, this.transformFeedbackVaryings, CONSTANTS.SEPARATE_ATTRIBS);
        }
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, CONSTANTS.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(program));
        }

        if (ownVertexShader) {
            vShader.delete();
        }

        if (ownFragmentShader) {
            fShader.delete();
        }

        this.program = program;
        this.bind();

        let numUniforms = this.gl.getProgramParameter(program, CONSTANTS.ACTIVE_UNIFORMS);
        let textureUnit;

        for (i = 0; i < numUniforms; ++i) {
            let uniformInfo = this.gl.getActiveUniform(program, i);
            let uniformHandle = this.gl.getUniformLocation(this.program, uniformInfo.name);
            let UniformClass = null;
            let type = uniformInfo.type;
            let numElements = uniformInfo.size;

            switch (type) {
                case CONSTANTS.SAMPLER_2D:
                case CONSTANTS.INT_SAMPLER_2D:
                case CONSTANTS.UNSIGNED_INT_SAMPLER_2D:
                case CONSTANTS.SAMPLER_2D_SHADOW:
                case CONSTANTS.SAMPLER_2D_ARRAY:
                case CONSTANTS.INT_SAMPLER_2D_ARRAY:
                case CONSTANTS.UNSIGNED_INT_SAMPLER_2D_ARRAY:
                case CONSTANTS.SAMPLER_2D_ARRAY_SHADOW:
                case CONSTANTS.SAMPLER_CUBE:
                case CONSTANTS.INT_SAMPLER_CUBE:
                case CONSTANTS.UNSIGNED_INT_SAMPLER_CUBE:
                case CONSTANTS.SAMPLER_CUBE_SHADOW:
                case CONSTANTS.SAMPLER_3D:
                case CONSTANTS.INT_SAMPLER_3D:
                case CONSTANTS.UNSIGNED_INT_SAMPLER_3D:
                    textureUnit = this.samplerCount++;
                    this.samplers[uniformInfo.name] = textureUnit;
                    this.gl.uniform1i(uniformHandle, textureUnit);
                    break;
                case CONSTANTS.INT:
                case CONSTANTS.UNSIGNED_INT:
                case CONSTANTS.FLOAT:
                    UniformClass = numElements > 1 ? MultiNumericUniform : SingleComponentUniform;
                    break;
                case CONSTANTS.BOOL:
                    UniformClass = numElements > 1 ? MultiBoolUniform : SingleComponentUniform;
                    break;
                case CONSTANTS.FLOAT_VEC2:
                case CONSTANTS.INT_VEC2:
                case CONSTANTS.UNSIGNED_INT_VEC2:
                case CONSTANTS.FLOAT_VEC3:
                case CONSTANTS.INT_VEC3:
                case CONSTANTS.UNSIGNED_INT_VEC3:
                case CONSTANTS.FLOAT_VEC4:
                case CONSTANTS.INT_VEC4:
                case CONSTANTS.UNSIGNED_INT_VEC4:
                    UniformClass = MultiNumericUniform;
                    break;
                case CONSTANTS.BOOL_VEC2:
                case CONSTANTS.BOOL_VEC3:
                case CONSTANTS.BOOL_VEC4:
                    UniformClass = MultiBoolUniform;
                    break;
                case CONSTANTS.FLOAT_MAT2:
                case CONSTANTS.FLOAT_MAT3:
                case CONSTANTS.FLOAT_MAT4:
                case CONSTANTS.FLOAT_MAT2x3:
                case CONSTANTS.FLOAT_MAT2x4:
                case CONSTANTS.FLOAT_MAT3x2:
                case CONSTANTS.FLOAT_MAT3x4:
                case CONSTANTS.FLOAT_MAT4x2:
                case CONSTANTS.FLOAT_MAT4x3:
                    UniformClass = MatrixUniform;
                    break;
                default:
                    console.error("Unrecognized type for uniform ", uniformInfo.name);
                    break;
            }

            if (UniformClass) {
                this.uniforms[uniformInfo.name] = new UniformClass(this.gl, uniformHandle, type, numElements);
            }
        }

        let numUniformBlocks = this.gl.getProgramParameter(program, CONSTANTS.ACTIVE_UNIFORM_BLOCKS);

        for (i = 0; i < numUniformBlocks; ++i) {
            let blockName = this.gl.getActiveUniformBlockName(this.program, i);
            let blockIndex = this.gl.getUniformBlockIndex(this.program, blockName);
            
            let uniformBlockBase = this.uniformBlockCount++;
            this.gl.uniformBlockBinding(this.program, blockIndex, uniformBlockBase);
            this.uniformBlocks[blockName] = uniformBlockBase;
        }

        return this;
    }

    /**
        删除这个程序。

        @method
        @return {Program} 程序对象。
    */
    delete() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
            this.program = null;

            if (this.appState.program === this) {
                this.gl.useProgram(null);
                this.appState.program = null;
            }
        }

        return this;
    }
    
    /**
        为一个 uniform 设置值。

        @method
        @ignore
        @return {Program} 程序对象。
    */
    uniform(name, value) {
        this.uniforms[name].set(value);

        return this;
    }

    // 
    /**
        使用这个程序

        @method
        @ignore
        @return {Program} 程序对象
    */
    bind() {
        if (this.appState.program !== this) {
            this.gl.useProgram(this.program);
            this.appState.program = this;
        }

        return this;
    }
}

module.exports = Program;
