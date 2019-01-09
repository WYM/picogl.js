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
const Query = require("./query");

/**
    渲染计时器。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {Object} cpuTimer CPU 计时器。优先使用 window.performance，如果不支持则使用 window.Date。
    @prop {boolean} gpuTimer GPU 计时器是否可用（取决于是否支持 EXT_disjoint_timer_query_webgl2 或 EXT_disjoint_timer_query）。
    @prop {WebGLQuery} gpuTimerQuery GPU 时间查询对象（仅在支持 GPU 计时器时有效）。
    @prop {boolean} gpuTimerQueryInProgress 是否有正在进行中的 GPU 时间查询操作。
    @prop {number} cpuStartTime 最后一次 CPU 计时器启动时间。
    @prop {number} cpuTime 上次CPU计时花费的时间。仅在 ready() 返回 true 时有效。
    @prop {number} gpuTime 上次GPU计时花费的时间。仅在 ready() 返回 true 时有效。
            如果 EXT_disjoint_timer_query_webgl2 扩展不可用，值固定为 0。
*/
class Timer {

    constructor(gl) {
        this.gl = gl;
        this.cpuTimer = window.performance || window.Date;

        this.gpuTimer = false;
        this.gpuTimerQuery = null;

        this.cpuStartTime = 0;
        this.cpuTime = 0;
        this.gpuTime = 0;

        this.restore();
    }

    /**
        在上下文丢失后恢复计时器。

        @method
        @return {Timer} 计时器对象。
    */
    restore() {
        this.gpuTimer = !!(this.gl.getExtension("EXT_disjoint_timer_query_webgl2") || this.gl.getExtension("EXT_disjoint_timer_query"));
        
        if (this.gpuTimer) {
            if (this.gpuTimerQuery) {
                this.gpuTimerQuery.restore();
            } else {
                this.gpuTimerQuery = new Query(this.gl, CONSTANTS.TIME_ELAPSED_EXT);
            }
        }

        this.cpuStartTime = 0;
        this.cpuTime = 0;
        this.gpuTime = 0;

        return this;
    }


    /**
        启动计时器。

        @method
        @return {Timer} 计时器对象。
    */
    start() {
        if (this.gpuTimer) {
            if (!this.gpuTimerQuery.active) {
                this.gpuTimerQuery.begin();
                this.cpuStartTime = this.cpuTimer.now();
            }
        } else {
            this.cpuStartTime = this.cpuTimer.now();
        }

        return this;
    }


    /**
        停止计时器。

        @method
        @return {Timer} 计时器对象。
    */
    end() {
        if (this.gpuTimer) {
            if (!this.gpuTimerQuery.active) {
                this.gpuTimerQuery.end();
                this.cpuTime = this.cpuTimer.now() - this.cpuStartTime;
            }
        } else {
            this.cpuTime = this.cpuTimer.now() - this.cpuStartTime;
        }

        return this;
    }

    /**
        检查计时结果是否可用。仅当这个方法返回true时，
        cpuTime 和 gpuTime 这两个属性才会被设为有效
        的值。

        @method
        @return {boolean} 结果是否可用。
    */
    ready() {
        if (this.gpuTimer) {
            if (!this.gpuTimerQuery.active) {
                return false;
            }

            var gpuTimerAvailable = this.gpuTimerQuery.ready();
            var gpuTimerDisjoint = this.gl.getParameter(CONSTANTS.GPU_DISJOINT_EXT);

            if (gpuTimerAvailable && !gpuTimerDisjoint) {
                this.gpuTime = this.gpuTimerQuery.result  / 1000000;
                return true;
            } else {
                return false;
            }
        } else {
            return !!this.cpuStartTime;
        }
    }

    /**
        删除这个 Timer。

        @method
        @return {Timer} 计时器对象。
    */
    delete() {
        if (this.gpuTimerQuery) {
            this.gpuTimerQuery.delete();
            this.gpuTimerQuery = null;
            this.gpuTimer = false;
        }

        return this;
    }

}

module.exports = Timer;
