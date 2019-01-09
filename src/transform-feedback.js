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

/**
    变换回传（Tranform feedback）对象。

    @class
    @prop {WebGLRenderingContext} gl WebGL上下文。
    @prop {WebGLTransformFeedback} transformFeedback WebGL 变换回传对象。
    @prop {Object} appState 跟踪的GL状态。
*/
class TransformFeedback {

    constructor(gl, appState) {
        this.gl = gl;
        this.appState = appState;
        this.transformFeedback = null;

        // TODO(Tarek): 因为 ANGLE 的 bug，这里需要重新绑定 buffers。
        // 修复后移除本节。
        this.angleBugBuffers = [];

        this.restore();
    }

    /**
        在上下文丢失后，恢复变换回传对象。

        @method
        @return {TransformFeedback} 变换回传对象。
    */
    restore() {
        if (this.appState.transformFeedback === this) {
            this.appState.transformFeedback = null;
        }

        this.transformFeedback = this.gl.createTransformFeedback();

        this.angleBugBuffers.length = 0;

        return this;
    }

    /**
        绑定一个变换回传对象以捕获变换输出。

        @method
        @param {number} index 需要捕获的变换回传 varying 索引。
        @param {VertexBuffer} buffer 用来记录输出信息的Buffer。
        @return {TransformFeedback} 变换回传对象。
    */
    feedbackBuffer(index, buffer) {
        this.bind();
        this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, this.transformFeedback);
        this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, buffer.buffer);

        this.angleBugBuffers[index] = buffer;

        return this;
    }

    /**
        删除这个变换回传。

        @method
        @return {TransformFeedback} 变换回传对象。
    */
    delete() {
        if (this.transformFeedback) {
            this.gl.deleteTransformFeedback(this.transformFeedback);
            this.transformFeedback = null;

            if (this.appState.transformFeedback === this) {
                this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
                this.appState.transformFeedback = null;
            }
        }

        return this;
    }

    /**
        绑定这个变换回传。

        @method
        @ignore
        @return {TransformFeedback} 变换回传对象。
    */
    bind() {
        if (this.appState.transformFeedback !== this) {
            this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, this.transformFeedback);
            this.appState.transformFeedback = this;

            for (let i = 0, len = this.angleBugBuffers.length; i < len; ++i) {
                this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, i, this.angleBugBuffers[i].buffer);
            }
        }

        return this;
    }

}

module.exports = TransformFeedback;
