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
    通用查询对象。

    @class
    @prop {WebGLRenderingContext} gl WebGL 上下文。
    @prop {WebGLQuery} query 查询对象。
    @prop {GLEnum} target 需要查询的信息类型。
    @prop {boolean} active 是否有任一查询正在进行。
    @prop {Any} result 查询结果（仅在ready()返回true时可用）。
*/
class Query {

    constructor(gl, target) {
        this.gl = gl;
        this.query = null;
        this.target = target;
        this.active = false;
        this.result = null;

        this.restore();
    }

    /**
        在上下文丢失后恢复查询。

        @method
        @return {Query} 查询对象。
    */
    restore() {
        this.query = this.gl.createQuery();
        this.active = false;
        this.result = null;

        return this;
    }

    /**
        开始查询。

        @method
        @return {Query} 查询对象。
    */
    begin() {
        if (!this.active) {
            this.gl.beginQuery(this.target, this.query);
            this.result = null;
        }

        return this;
    }

    /**
        结束查询。

        @method
        @return {Query} 查询对象。
    */
    end() {
        if (!this.active) {
            this.gl.endQuery(this.target);
            this.active = true;
        }

        return this;
    }

    /**
        检查查询结果是否可用。

        @method
        @return {boolean} 查询结果是否可用。
    */
    ready() {
        if (this.active && this.gl.getQueryParameter(this.query, this.gl.QUERY_RESULT_AVAILABLE)) {
            this.active = false;
            // Note(Tarek): 因为 FF 会错误地返回布尔型，这里包装一层。
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1422714 
            this.result = Number(this.gl.getQueryParameter(this.query, this.gl.QUERY_RESULT));
            return true;
        }

        return false;
    }

    /**
        删除这个查询。

        @method
        @return {Query} 查询对象。
    */
    delete() {
        if (this.query) {
            this.gl.deleteQuery(this.query);
            this.query = null;
        }

        return this;
    }

}

module.exports = Query;
