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
    存储顶点数据。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文
    @prop {WebGLBuffer} buffer 分配的缓冲对象。
    @prop {GLEnum} type 存储在缓冲中的数据类型。
    @prop {number} itemSize 每顶点数组元素数量。
    @prop {number} numItems 表示的定顶点数量。
    @prop {GLEnum} usage 缓冲的使用模式。
    @prop {boolean} indexArray 是否是一个索引数组。
    @prop {GLEnum} binding GL绑定点（ARRAY_BUFFER 或 ELEMENT_ARRAY_BUFFER）。
    @prop {Object} appState 跟踪的GL状态。
*/
class VertexBuffer {

    constructor(gl, appState, type, itemSize, data, usage = gl.STATIC_DRAW, indexArray) {
        let numColumns;
        switch(type) {
            case CONSTANTS.FLOAT_MAT4:
            case CONSTANTS.FLOAT_MAT4x2:
            case CONSTANTS.FLOAT_MAT4x3:
                numColumns = 4;
                break;
            case CONSTANTS.FLOAT_MAT3:
            case CONSTANTS.FLOAT_MAT3x2:
            case CONSTANTS.FLOAT_MAT3x4:
                numColumns = 3;
                break;
            case CONSTANTS.FLOAT_MAT2:
            case CONSTANTS.FLOAT_MAT2x3:
            case CONSTANTS.FLOAT_MAT2x4:
                numColumns = 2;
                break;
            default:
                numColumns = 1;
        }

        switch(type) {
            case CONSTANTS.FLOAT_MAT4:
            case CONSTANTS.FLOAT_MAT3x4:
            case CONSTANTS.FLOAT_MAT2x4:
                itemSize = 4;
                type = CONSTANTS.FLOAT;
                break;
            case CONSTANTS.FLOAT_MAT3:
            case CONSTANTS.FLOAT_MAT4x3:
            case CONSTANTS.FLOAT_MAT2x3:
                itemSize = 3;
                type = CONSTANTS.FLOAT;
                break;
            case CONSTANTS.FLOAT_MAT2:
            case CONSTANTS.FLOAT_MAT3x2:
            case CONSTANTS.FLOAT_MAT4x2:
                itemSize = 2;
                type = CONSTANTS.FLOAT;
                break;
        }

        let dataLength;
        if (typeof data === "number") {
            dataLength = data;
            data *= CONSTANTS.TYPE_SIZE[type];
        } else {
            dataLength = data.length;
        }

        this.gl = gl;
        this.buffer = null;
        this.appState = appState;
        this.type = type;
        this.itemSize = itemSize;
        this.numItems = dataLength / (itemSize * numColumns);
        this.numColumns = numColumns;
        this.usage = usage;
        this.indexArray = !!indexArray;
        this.binding = this.indexArray ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

        this.restore(data);
    }

    /**
        在上下文丢失后恢复顶点缓冲。

        @method
        @param {ArrayBufferView|number} data 缓冲数据本身或分配的元素总数。
        @return {VertexBuffer} 顶点缓冲对象。
    */
    restore(data) {
        if (!data) {
            data = this.numItems * this.itemSize * this.numColumns * CONSTANTS.TYPE_SIZE[this.type];
        }

        // 不要更新顶点数组的绑定
        if (this.appState.vertexArray) {
            this.gl.bindVertexArray(null);
            this.appState.vertexArray = null;
        }

        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.binding, this.buffer);
        this.gl.bufferData(this.binding, data, this.usage);
        this.gl.bindBuffer(this.binding, null);

        return this;
    }

    /**
        更新这个缓冲中的数据。注意：data 必须与已分配的缓冲相符。

        @method
        @param {VertexBufferView} data 要存储到缓冲的数据。
        @return {VertexBuffer} 顶点缓冲对象。
    */
    data(data) {
        // 不要更新顶点数组的绑定
        if (this.appState.vertexArray) {
            this.gl.bindVertexArray(null);
            this.appState.vertexArray = null;
        }

        this.gl.bindBuffer(this.binding, this.buffer);
        this.gl.bufferSubData(this.binding, 0, data);
        this.gl.bindBuffer(this.binding, null);

        return this;
    }

    /**
        删除这个顶点缓冲。

        @method
        @return {VertexBuffer} 顶点缓冲对象。
    */
    delete() {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }

        return this;
    }

}

module.exports = VertexBuffer;
