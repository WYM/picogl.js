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
    管理顶点缓冲和属性状态。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLVertexArrayObject} vertexArray 顶点数组对象。
    @prop {number} numElements 顶点数组中的元素数量。
    @prop {boolean} indexed 该顶点数组是用于索引绘制。
    @prop {GLenum} indexType 推断的数据类型。
    @prop {boolean} instanced 该顶点数组是否用于实例绘制（Instanced Drawing）。
    @prop {number} numInstances 这个顶点数组需要绘制的实例数量。
    @prop {Object} appState 跟踪的GL状态。
*/
class VertexArray {
    
    constructor(gl, appState, numElements = 0, numInstances = 0) {
        this.gl = gl;
        this.appState = appState;
        this.vertexArray = null;
        this.numElements = numElements;
        this.indexType = null;
        this.instancedBuffers = 0;
        this.indexed = false;
        this.numInstances = numInstances;
    }

    /**
        在上下文丢失后恢复顶点数组对象。

        @method
        @return {VertexArray} 顶点数组对象。
    */
    restore() {
        if (this.appState.vertexArray === this) {
            this.appState.vertexArray = null;
        }

        // 可能的话，在 gl 层进行重新分配
        if (this.vertexArray !== null) {
            this.vertexArray = this.gl.createVertexArray();
        }

        return this;
    }


    /**
        为这个顶点数组绑定一个逐顶点属性缓冲。

        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    vertexAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, false, false, false);

        return this;
    }

    /**
        为这个顶点数组绑定一个逐实例属性缓冲。

        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    instanceAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, true, false, false);

        return this;
    }

    /**
        为这个顶点数组绑定一个逐顶点整型属性缓冲。
        注意：这代表shader中引用的属性是整型，不是存储在顶点缓冲中的数据。

        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    vertexIntegerAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, false, true, false);

        return this;
    }

    /**
        为这个顶点数组绑定一个逐实例整型属性缓冲。
        注意：这代表shader中引用的属性是整型，不是存储在顶点缓冲中的数据。

        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    instanceIntegerAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, true, true, false);

        return this;
    }

    /**
        为这个顶点数组绑定一个逐顶点归一化属性缓冲。
        在顶点缓冲中的整型数据将会被归一化为[-1.0, 1.0]，无符号整型将被归一化为[0.0, 1.0]。

        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    vertexNormalizedAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, false, false, true);

        return this;
    }

    /**
        为这个顶点数组绑定一个逐实例归一化属性缓冲。
        在顶点缓冲中的整型数据将会被归一化为[-1.0, 1.0]，无符号整型将被归一化为[0.0, 1.0]。
        
        @method
        @param {number} attributeIndex 要绑定的属性 location。
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    instanceNormalizedAttributeBuffer(attributeIndex, vertexBuffer) {
        this.attributeBuffer(attributeIndex, vertexBuffer, true, false, true);

        return this;
    }

    /**
        为这个顶点数组绑定一个索引缓冲。

        @method
        @param {VertexBuffer} vertexBuffer 要绑定的顶点缓冲。
        @return {VertexArray} 顶点数组对象。
    */
    indexBuffer(vertexBuffer) {
        // 如果可能，在 gl 层进行分配
        if (this.vertexArray === null) {
            this.vertexArray = this.gl.createVertexArray();
        }

        this.bind();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, vertexBuffer.buffer);

        this.numElements = vertexBuffer.numItems * 3;
        this.indexType = vertexBuffer.type;
        this.indexed = true;

        return this;
    }

    /**
        删除这个顶点数组。

        @method
        @return {VertexArray} 顶点数组对象。
    */
    delete() {
        if (this.vertexArray) {
            this.gl.deleteVertexArray(this.vertexArray);
            this.vertexArray = null;

            if (this.appState.vertexArray === this) {
                this.gl.bindVertexArray(null);
                this.appState.vertexArray = null;
            }
        }

        return this;
    }

    /**
        绑定这个顶点数组。

        @method
        @ignore
        @return {VertexArray} 顶点数组对象。
    */
    bind() {
        if (this.appState.vertexArray !== this) {
            this.gl.bindVertexArray(this.vertexArray);
            this.appState.vertexArray = this;
        }

        return this;
    }

    /**
        附着一个属性缓冲。

        @method
        @ignore
        @return {VertexArray} 顶点数组对象。
    */
    attributeBuffer(attributeIndex, vertexBuffer, instanced, integer, normalized) {
        // 如果可能，在 gl 层分配
        if (this.vertexArray === null) {
            this.vertexArray = this.gl.createVertexArray();
        }

        this.bind();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer.buffer);

        let numColumns = vertexBuffer.numColumns;

        for (let i = 0; i < numColumns; ++i) {
            if (integer) {
                this.gl.vertexAttribIPointer(
                    attributeIndex + i,
                    vertexBuffer.itemSize,
                    vertexBuffer.type,
                    numColumns * vertexBuffer.itemSize * CONSTANTS.TYPE_SIZE[vertexBuffer.type],
                    i * vertexBuffer.itemSize * CONSTANTS.TYPE_SIZE[vertexBuffer.type]);
            } else {
                this.gl.vertexAttribPointer(
                    attributeIndex + i,
                    vertexBuffer.itemSize,
                    vertexBuffer.type,
                    normalized,
                    numColumns * vertexBuffer.itemSize * CONSTANTS.TYPE_SIZE[vertexBuffer.type],
                    i * vertexBuffer.itemSize * CONSTANTS.TYPE_SIZE[vertexBuffer.type]);
            }

            if (instanced) {
                this.gl.vertexAttribDivisor(attributeIndex + i, 1);
            }

            this.gl.enableVertexAttribArray(attributeIndex + i);
        }

        this.instanced = this.instanced || instanced;

        if (instanced) {
            this.numInstances = vertexBuffer.numItems;
        } else {
            this.numElements = this.numElements || vertexBuffer.numItems;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        return this;
    }
}

module.exports = VertexArray;
