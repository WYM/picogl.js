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
    DrawCall 代表一次 DrawCall 关联的 attributes、uniforms 和 textures 的程序和值。
 
    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {Program} currentProgram 本次 DrawCall 使用的 Program。
    @prop {VertexArray} currentVertexArray 本次 DrawCall 使用的顶点数组。
    @prop {TransformFeedback} currentTransformFeedback 本次 DrawCall 使用的变换回传（Transform feedback）。
    @prop {Array} uniformBuffers 活跃 uniform buffers 的有序列表。
    @prop {Array} uniformBlockNames uniform 块名称的有序列表。
    @prop {Object} uniformBlockBases uniform 块到 uniform buffer bases 的映射。
    @prop {Number} uniformBlockCount 本次 DrawCall 使用的活跃 uniform 块数量。
    @prop {Object} uniformIndices uniform 名称到 uniform 数组的映射。
    @prop {Array} uniformNames 活跃 uniform 名称的有序列表。
    @prop {Array} uniformValue 活跃 uniform 值的有序列表。
    @prop {number} uniformCount 本次 DrawCall 使用的活跃 uniform 数量。
    @prop {Array} textures 活跃贴图数组。
    @prop {number} textureCount 本次 DrawCall 使用的活跃贴图数量。
    @prop {GLEnum} primitive 绘制的 primitive 类型。
    @prop {Object} appState 跟踪的GL状态。
    @prop {GLsizei} numElements 需要绘制的元素数量。
    @prop {GLsizei} numInstances 需要绘制的实例数量。
*/
class DrawCall {

    constructor(gl, appState, program, vertexArray, primitive = CONSTANTS.TRIANGLES) {
        this.gl = gl;
        this.currentProgram = program;
        this.currentVertexArray = vertexArray;
        this.currentTransformFeedback = null;
        this.appState = appState;

        this.uniformIndices = {};
        this.uniformNames = new Array(CONSTANTS.WEBGL_INFO.MAX_UNIFORMS);
        this.uniformValues = new Array(CONSTANTS.WEBGL_INFO.MAX_UNIFORMS);
        this.uniformCount = 0;
        this.uniformBuffers = new Array(CONSTANTS.WEBGL_INFO.MAX_UNIFORM_BUFFERS);
        this.uniformBlockNames = new Array(CONSTANTS.WEBGL_INFO.MAX_UNIFORM_BUFFERS);
        this.uniformBlockBases = {};
        this.uniformBlockCount = 0;
        this.samplerIndices = {};
        this.textures = new Array(CONSTANTS.WEBGL_INFO.MAX_TEXTURE_UNITS);
        this.textureCount = 0;
        this.primitive = primitive;

        this.numElements = this.currentVertexArray.numElements;
        this.numInstances = this.currentVertexArray.numInstances;
    }

    /**
        设置当前绘制使用的变换回传（Transform Feedback）对象。

        @method
        @param {TransformFeedback} transformFeedback 要设置的变换回传（Transform Feedback）对象。
        @return {DrawCall} DrawCall 对象。
    */
    transformFeedback(transformFeedback) {
        this.currentTransformFeedback = transformFeedback;

        return this;
    }

    /**
        设定一个 uniform 的值。在 uniform 名称结尾添加“[0]”可以使用数组形式
        的 uniform ，数组形式的 value 应为带有全部所需值的 float 类型数组。
        
        @method
        @param {string} name Uniform 名称。
        @param {any} value Uniform 值。
        @return {DrawCall} DrawCall 对象。
    */
    uniform(name, value) {
        let index = this.uniformIndices[name];
        if (index === undefined) {
            index = this.uniformCount++;
            this.uniformIndices[name] = index;
            this.uniformNames[index] = name;
        }
        this.uniformValues[index] = value;

        return this;
    }

    /**
        设置绑定到采样 uniform 的贴图。

        @method
        @param {string} name 采样 uniform 名称。
        @param {Texture|Cubemap} texture 要绑定的 Texture 或 Cubemap。
        @return {DrawCall} DrawCall 对象。
    */
    texture(name, texture) {
        let unit = this.currentProgram.samplers[name];
        this.textures[unit] = texture;

        return this;
    }

    /**
        设定绑定到 uniform 块的 uniform buffer。

        @method
        @param {string} name uniform 块名称。
        @param {UniformBuffer} buffer 要绑定的 uniform buffer。
        @return {DrawCall} DrawCall对象。
    */
    uniformBlock(name, buffer) {
        let base = this.currentProgram.uniformBlocks[name];
        this.uniformBuffers[base] = buffer;

        return this;
    }

    /**
        设定 numElements 属性限制将会被绘制的元素数量。

        @method
        @param {GLsizei} [count=0] 需要绘制的元素数量，0代表绘制全部。
        @return {DrawCall} DrawCall 对象。
    */
    elementCount(count = 0) {
        if (count > 0) {
            this.numElements = Math.min(count, this.currentVertexArray.numElements);
        } else {
            this.numElements = this.currentVertexArray.numElements;
        }

        return this;
    }

    /**
        设定 numInstances 属性限制将会被绘制的实例数量。

        @method
        @param {GLsizei} [count=0] 需要绘制的实例数量，0代表绘制全部。
        @return {DrawCall} DrawCall 对象。
    */
    instanceCount(count = 0) {
        if (count > 0) {
            this.numInstances = Math.min(count, this.currentVertexArray.numInstances);
        } else {
            this.numInstances = this.currentVertexArray.numInstances;
        }

        return this;
    }

    /**
        根据当前状态进行绘制。

        @method
        @return {DrawCall} DrawCall 对象。
    */
    draw() {
        let uniformNames = this.uniformNames;
        let uniformValues = this.uniformValues;
        let uniformBuffers = this.uniformBuffers;
        let uniformBlockCount = this.currentProgram.uniformBlockCount;
        let textures = this.textures;
        let textureCount = this.currentProgram.samplerCount;

        this.currentProgram.bind();
        this.currentVertexArray.bind();

        for (let uIndex = 0; uIndex < this.uniformCount; ++uIndex) {
            this.currentProgram.uniform(uniformNames[uIndex], uniformValues[uIndex]);
        }

        for (let base = 0; base < uniformBlockCount; ++base) {
            uniformBuffers[base].bind(base);
        }

        for (let tIndex = 0; tIndex < textureCount; ++tIndex) {
            textures[tIndex].bind(tIndex);
        }

        if (this.currentTransformFeedback) {
            this.currentTransformFeedback.bind();
            this.gl.beginTransformFeedback(this.primitive);
        }

        if (this.currentVertexArray.instanced) {
            if (this.currentVertexArray.indexed) {
                this.gl.drawElementsInstanced(this.primitive, this.numElements, this.currentVertexArray.indexType, 0, this.numInstances);
            } else {
                this.gl.drawArraysInstanced(this.primitive, 0, this.numElements, this.numInstances);
            }
        } else if (this.currentVertexArray.indexed) {
            this.gl.drawElements(this.primitive, this.numElements, this.currentVertexArray.indexType, 0);
        } else {
            this.gl.drawArrays(this.primitive, 0, this.numElements);
        }

        if (this.currentTransformFeedback) {
            this.gl.endTransformFeedback();
            // TODO(Tarek): 由于FF中使用的旧版本 ANGLE 存在 bug ，这里需要重新绑定 buffers 。
            // bug修复后移除本节。
            for (let i = 0, len = this.currentTransformFeedback.angleBugBuffers.length; i < len; ++i) {
                this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, i, null);
            }
        }

        return this;
    }

}

module.exports = DrawCall;
