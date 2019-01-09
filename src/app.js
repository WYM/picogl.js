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

const CONSTANTS               = require("./constants");
const TEXTURE_FORMAT_DEFAULTS = require("./texture-format-defaults");
const Cubemap                 = require("./cubemap");
const DrawCall                = require("./draw-call");
const Framebuffer             = require("./framebuffer");
const Renderbuffer            = require("./renderbuffer");
const Program                 = require("./program");
const Shader                  = require("./shader");
const Texture                 = require("./texture");
const Timer                   = require("./timer");
const TransformFeedback       = require("./transform-feedback");
const UniformBuffer           = require("./uniform-buffer");
const VertexArray             = require("./vertex-array");
const VertexBuffer            = require("./vertex-buffer");
const Query                   = require("./query");

/**
    PicoGL的主入口。App会存储所有的WebGL状态。

    @class
    @prop {DOMElement} canvas 当前app绘制的目标canvas。
    @prop {WebGLRenderingContext} gl WebGL上下文。
    @prop {number} width 当前绘制平面的宽度。
    @prop {number} height 当前绘制平面的高度。
    @prop {boolean} floatRenderTargetsEnabled EXT_color_buffer_float扩展是否可用。
    @prop {boolean} linearFloatTexturesEnabled OES_texture_float_linear扩展是否可用。
    @prop {boolean} s3tcTexturesEnabled WEBGL_compressed_texture_s3tc扩展是否可用。
    @prop {boolean} s3tcSRGBTexturesEnabled WEBGL_compressed_texture_s3tc_srgb扩展是否可用。
    @prop {boolean} etcTexturesEnabled WEBGL_compressed_texture_etc扩展是否可用。
    @prop {boolean} astcTexturesEnabled WEBGL_compressed_texture_astc扩展是否可用。
    @prop {boolean} pvrtcTexturesEnabled WEBGL_compressed_texture_pvrtc扩展是否可用。
    @prop {Object} state 跟踪的GL状态。
    @prop {GLEnum} clearBits Current clear mask to use with clear().    
*/
class App {
    
    constructor(gl, canvas) {
        this.canvas = canvas;
        this.gl = gl;
        this.width = this.gl.drawingBufferWidth;
        this.height = this.gl.drawingBufferHeight;
        this.viewportX = 0;
        this.viewportY = 0;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        this.currentDrawCalls = null;
        this.emptyFragmentShader = null;

        this.state = {
            program: null,
            vertexArray: null,
            transformFeedback: null,
            activeTexture: -1,
            textures: new Array(CONSTANTS.WEBGL_INFO.MAX_TEXTURE_UNITS),
            uniformBuffers: new Array(CONSTANTS.WEBGL_INFO.MAX_UNIFORM_BUFFERS),
            freeUniformBufferBases: [],
            drawFramebuffer: null,
            readFramebuffer: null
        };

        this.clearBits = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT| this.gl.STENCIL_BUFFER_BIT;

        this.cpuTime = 0;
        this.gpuTime = 0;

        // 扩展
        this.floatRenderTargetsEnabled = false;
        this.linearFloatTexturesEnabled = false;
        this.s3tcTexturesEnabled = false;
        this.s3tcSRGBTexturesEnabled = false;
        this.etcTexturesEnabled = false;
        this.astcTexturesEnabled = false;
        this.pvrtcTexturesEnabled = false;

        this.viewport(0, 0, this.width, this.height);

        this.contextRestoredHandler = null;
        this.contextLostExt = null;
    }

    /**
        模拟丢失上下文。

        @method
        @return {App} App对象。
    */
    loseContext() {
        if (!this.contextLostExt) {
            this.contextLostExt = this.gl.getExtension("WEBGL_lose_context");
        }

        if (this.contextLostExt) {
            this.contextLostExt.loseContext();
        }

        return this;
    }

    /**
        模拟恢复上下文。

        @method
        @return {App} App对象。
    */
    restoreContext() {
        if (this.contextLostExt) {
            this.contextLostExt.restoreContext();
        }

        return this;
    }

    /**
        为上下文从丢失中恢复设定一个句柄。

        @method
        @param {function} fn 上下文恢复句柄。
        @return {App} App对象。
    */
    onContextRestored(fn) {
        if (this.contextRestoredHandler) {
            this.canvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler);
        } else {
            this.canvas.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
            });
        }
        
        this.canvas.addEventListener("webglcontextrestored", fn);
        this.contextRestoredHandler = fn;

        return this;
    }

    /**
        Set the color mask to selectively enable or disable particular
        color channels while rendering.

        @method
        @param {boolean} r 红色通道。
        @param {boolean} g 绿色通道。
        @param {boolean} b 蓝色通道。
        @param {boolean} a Alpha通道。
        @return {App} App对象。
    */
    colorMask(r, g, b, a) {
        this.gl.colorMask(r, g, b, a);

        return this;
    }

    /**
        设定清除颜色。

        @method
        @param {number} r 红色通道。
        @param {number} g 绿色通道。
        @param {number} b 蓝色通道。
        @param {number} a Alpha通道。
        @return {App} App对象。
    */
    clearColor(r, g, b, a) {
        this.gl.clearColor(r, g, b, a);

        return this;
    }

    /**
        Set the clear mask bits to use when calling clear().
        示例：app.clearMask(PicoGL.COLOR_BUFFER_BIT)。

        @method
        @param {GLEnum} mask Bit mask of buffers to clear.
        @return {App} App对象。
    */
    clearMask(mask) {
        this.clearBits = mask;

        return this;
    }

    /**
        清空画布。

        @method
        @return {App} App对象。
    */
    clear() {
        this.gl.clear(this.clearBits);

        return this;
    }

    /**
        为WebGL上下文绑定一个绘图framebuffer。

        @method
        @param {Framebuffer} framebuffer 要绑定的Framebuffer.
        @see Framebuffer
        @return {App} App对象。
    */
    drawFramebuffer(framebuffer) {
        framebuffer.bindForDraw();

        return this;
    }

    /**
        为WebGL上下文绑定一个读取framebuffer。

        @method
        @param {Framebuffer} framebuffer 要绑定的Framebuffer.
        @see Framebuffer
        @return {App} App对象。
    */
    readFramebuffer(framebuffer) {
        framebuffer.bindForRead();

        return this;
    }

    /**
        切换回默认的绘图framebuffer（例如：绘制到屏幕）。
        注意这个方法会重置视口以适应默认framebuffer。

        @method
        @return {App} App对象。
    */
    defaultDrawFramebuffer() {
        if (this.state.drawFramebuffer !== null) {
            this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);
            this.state.drawFramebuffer = null;
        }

        return this;
    }

    /**
        切换回默认读取framebuffer（例如：从屏幕读取）。

        @method
        @return {App} App 对象。
    */
    defaultReadFramebuffer() {
        if (this.state.readFramebuffer !== null) {
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, null);
            this.state.readFramebuffer = null;
        }

        return this;
    }

    /**
        从附加到READ_FRAMEBUFFER的framebuffer复制数据到绑定到DRAW_FRAMEBUFFER的framebuffer。

        @method
        @param {GLEnum} mask 写掩码（例如：PicoGL.COLOR_BUFFER_BIT）。
        @param {Object} [options] Blit options.
        @param {number} [options.srcStartX=0] Source start x coordinate. 
        @param {number} [options.srcStartY=0] Source start y coordinate. 
        @param {number} [options.srcEndX=Width of the read framebuffer] Source end x coordinate. 
        @param {number} [options.srcEndY=Height of the read framebuffer] Source end y coordinate. 
        @param {number} [options.dstStartX=0] Destination start x coordinate. 
        @param {number} [options.dstStartY=0] Destination start y coordinate. 
        @param {number} [options.dstEndX=Width of the draw framebuffer] Destination end x coordinate. 
        @param {number} [options.dstEndY=Height of the draw framebuffer] Destination end y coordinate. 
        @param {number} [options.filter=NEAREST] Sampling filter. 
        @return {App} App 对象。
    */  
    blitFramebuffer(mask, options = CONSTANTS.DUMMY_OBJECT) {
        let readFramebuffer = this.state.readFramebuffer;
        let drawFramebuffer = this.state.drawFramebuffer;
        let defaultReadWidth = readFramebuffer ? readFramebuffer.width : this.width;
        let defaultReadHeight = readFramebuffer ? readFramebuffer.height : this.height;
        let defaultDrawWidth = drawFramebuffer ? drawFramebuffer.width : this.width;
        let defaultDrawHeight = drawFramebuffer ? drawFramebuffer.height : this.height;

        let {
            srcStartX = 0,
            srcStartY = 0,
            srcEndX = defaultReadWidth,
            srcEndY = defaultReadHeight,
            dstStartX = 0,
            dstStartY = 0,
            dstEndX = defaultDrawWidth,
            dstEndY = defaultDrawHeight,
            filter = CONSTANTS.NEAREST
        } = options;

        this.gl.blitFramebuffer(srcStartX, srcStartY, srcEndX, srcEndY, dstStartX, dstStartY, dstEndX, dstEndY, mask, filter);

        return this;
    }

    /**
        设定深度范围。

        @method
        @param {number} near 最小深度值。
        @param {number} far 最大深度值。
        @return {App} App 对象。
    */
    depthRange(near, far) {
        this.gl.depthRange(near, far);

        return this;
    }

    /**
        开启深度测试。

        @method
        @return {App} App 对象。
    */
    depthTest() {
        this.gl.enable(this.gl.DEPTH_TEST);

        return this;
    }

    /**
        关闭深度测试

        @method
        @return {App} App 对象。
    */
    noDepthTest() {
        this.gl.disable(this.gl.DEPTH_TEST);

        return this;
    }

    /**
        开启或关闭写入深度缓冲。

        @method
        @param {Boolean} mask 深度 mask。
        @return {App} App 对象。
    */
    depthMask(mask) {
        this.gl.depthMask(mask);

        return this;
    }

    /**
        设定深度测试方法。例如：app.depthFunc(PicoGL.LEQUAL).

        @method
        @param {GLEnum} func 使用的深度测试方法。
        @return {App} App 对象。
    */
    depthFunc(func) {
        this.gl.depthFunc(func);

        return this;
    }

    /**
        开启混合

        @method
        @return {App} App 对象。
    */
    blend() {
        this.gl.enable(this.gl.BLEND);

        return this;
    }

    /**
        关闭混合。

        @method
        @return {App} App 对象。
    */
    noBlend() {
        this.gl.disable(this.gl.BLEND);

        return this;
    }

    /**
        设定混合模式。例如：app.blendFunc(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA)。

        @method
        @param {GLEnum} src 混合源权重。
        @param {GLEnum} dest 混合目标权重。
        @return {App} App 对象。
    */
    blendFunc(src, dest) {
        this.gl.blendFunc(src, dest);

        return this;
    }

    /**
        设定混合模式，同时为颜色和 alpha 通道分别设置混合权重。
        例如：app.blendFuncSeparate(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA, PicoGL.ONE, PicoGL.ONE)。

        @method
        @param {GLEnum} csrc 混合源 RGB 通道权重。
        @param {GLEnum} cdest 混合目标 RGB 通道权重。
        @param {GLEnum} asrc 混合源 alpha 通道权重。
        @param {GLEnum} adest 混合目标 alpha 通道权重。
        @return {App} App 对象。
    */
    blendFuncSeparate(csrc, cdest, asrc, adest) {
        this.gl.blendFuncSeparate(csrc, cdest, asrc, adest);

        return this;
    }

    /**
        开启蒙版测试。
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @return {App} App 对象。
    */
    stencilTest() {
        this.gl.enable(this.gl.STENCIL_TEST);

        return this;
    }

    /**
        关闭蒙版测试。

        @method
        @return {App} App 对象。
    */
    noStencilTest() {
        this.gl.disable(this.gl.STENCIL_TEST);

        return this;
    }


    /**
        开启裁剪测试。

        @method
        @return {App} App 对象。
    */
    scissorTest() {
        this.gl.enable(this.gl.SCISSOR_TEST);

        return this;
    }

    /**
        关闭裁剪测试。

        @method
        @return {App} App 对象。
    */
    noScissorTest() {
        this.gl.disable(this.gl.SCISSOR_TEST);

        return this;
    }

    /**
        定义裁剪盒

        @method
        @return {App} App 对象。
    */
    scissor(x, y, width, height) {
        this.gl.scissor(x, y, width, height);

        return this;
    }

    /**
        设定用于已测试蒙版值得位掩码。
        例如：app.stencilMask(0xFF).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @param {number} mask 掩码值。
        @return {App} App 对象。

    */
    stencilMask(mask) {
        this.gl.stencilMask(mask);

        return this;
    }

    /**
        设定用于特定朝向的已测试蒙版值得位掩码。
        例如：app.stencilMaskSeparate(PicoGL.FRONT, 0xFF).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。
        
        @method
        @param {GLEnum} face 需要应用掩码的朝向。
        @param {number} mask 掩码值。
        @return {App} App 对象。
    */
    stencilMaskSeparate(face, mask) {
        this.gl.stencilMaskSeparate(face, mask);

        return this;
    }

    /**
        设定蒙版测试方法和引用值。
        例如：app.stencilFunc(PicoGL.EQUAL, 1, 0xFF).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @param {GLEnum} func 测试方法。
        @param {number} ref 引用的值。
        @param {GLEnum} mask The bitmask to use against tested values before applying
            the stencil function.
        @return {App} App 对象。
    */
    stencilFunc(func, ref, mask) {
        this.gl.stencilFunc(func, ref, mask);

        return this;
    }

    /**
        设定用于特定朝向的蒙版方法和引用值。    
        例如：app.stencilFuncSeparate(PicoGL.FRONT, PicoGL.EQUAL, 1, 0xFF).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @param {GLEnum} face The face orientation to apply the function to.
        @param {GLEnum} func The testing function.
        @param {number} ref The reference value.
        @param {GLEnum} mask The bitmask to use against tested values before applying
            the stencil function.
        @return {App} The App object.
    */
    stencilFuncSeparate(face, func, ref, mask) {
        this.gl.stencilFuncSeparate(face, func, ref, mask);

        return this;
    }

    /**
        设定蒙版缓冲值的更新操作。
        例如：app.stencilOp(PicoGL.KEEP, PicoGL.KEEP, PicoGL.REPLACE).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @param {GLEnum} stencilFail Operation to apply if the stencil test fails.
        @param {GLEnum} depthFail Operation to apply if the depth test fails.
        @param {GLEnum} pass Operation to apply if the both the depth and stencil tests pass.
        @return {App} The App object.
    */
    stencilOp(stencilFail, depthFail, pass) {
        this.gl.stencilOp(stencilFail, depthFail, pass);

        return this;
    }

    /**
        设定用于特定朝向的蒙版缓冲值的更新操作。  
        例如：app.stencilOpSeparate(PicoGL.FRONT, PicoGL.KEEP, PicoGL.KEEP, PicoGL.REPLACE).
        注意：仅当创建 App 时，传入了 { stencil: true } 上下文参数才会生效。

        @method
        @param {GLEnum} face The face orientation to apply the operations to.
        @param {GLEnum} stencilFail Operation to apply if the stencil test fails.
        @param {GLEnum} depthFail Operation to apply if the depth test fails.
        @param {GLEnum} pass Operation to apply if the both the depth and stencil tests pass.
        @return {App} The App object.
    */
    stencilOpSeparate(face, stencilFail, depthFail, pass) {
        this.gl.stencilOpSeparate(face, stencilFail, depthFail, pass);

        return this;
    }

    /**
        启用光栅化步骤。

        @method
        @return {App} App 对象。
    */
    rasterize() {
        this.gl.disable(this.gl.RASTERIZER_DISCARD);

        return this;
    }

    /**
        禁用光栅化步骤。

        @method
        @return {App} App 对象。
    */
    noRasterize() {
        this.gl.enable(this.gl.RASTERIZER_DISCARD);

        return this;
    }

    /**
        启用背面剔除。

        @method
        @return {App} App 对象。
    */
    cullBackfaces() {
        this.gl.enable(this.gl.CULL_FACE);

        return this;
    }

    /**
        禁用背面剔除。

        @method
        @return {App} App 对象。
    */
    drawBackfaces() {
        this.gl.disable(this.gl.CULL_FACE);

        return this;
    }

    /**
        启用 EXT_color_buffer_float 扩展。允许在帧缓冲对象上以渲染目标的形式创建浮点纹理。

        @method
        @see Framebuffer
        @return {App} App 对象。
    */
    floatRenderTargets() {
        this.floatRenderTargetsEnabled = !!this.gl.getExtension("EXT_color_buffer_float");

        return this;
    }

    /**
        启用 OES_texture_float_linear 扩展。允许在浮点纹理上使用线性混合。

        @method
        @see Framebuffer
        @return {App} App 对象。
    */
    linearFloatTextures() {
        this.linearFloatTexturesEnabled = !!this.gl.getExtension("OES_texture_float_linear");

        return this;
    }


    /**
        启用 WEBGL_compressed_texture_s3tc 和 WEBGL_compressed_texture_s3tc_srgb 扩展。该扩展允许
        使用以下枚举的贴图格式：

        <ul>
          <li>PicoGL.COMPRESSED_RGB_S3TC_DXT1_EXT
          <li>PicoGL.COMPRESSED_RGBA_S3TC_DXT1_EXT
          <li>PicoGL.COMPRESSED_RGBA_S3TC_DXT3_EXT
          <li>PicoGL.COMPRESSED_RGBA_S3TC_DXT5_EXT
          <li>PicoGL.COMPRESSED_SRGB_S3TC_DXT1_EXT
          <li>PicoGL.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT
          <li>PicoGL.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT
          <li>PicoGL.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT
        </ul>

        @method
        @return {App} App 对象。
    */
    s3tcTextures() {
        let ext = this.gl.getExtension("WEBGL_compressed_texture_s3tc");
        this.s3tcTexturesEnabled = !!ext;
        
        if (this.s3tcTexturesEnabled) {
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT]  = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_S3TC_DXT1_EXT] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT] = true;
        }

        ext = this.gl.getExtension("WEBGL_compressed_texture_s3tc_srgb");
        this.s3tcSRGBTexturesEnabled = !!ext;
        
        if (this.s3tcSRGBTexturesEnabled) {
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB_S3TC_DXT1_EXT]       = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT] = true;
        }

        return this;
    }

    /**
        启用 WEBGL_compressed_texture_etc 扩展。该扩展允许使用以下枚举的贴图格式：
        
        <ul>
          <li>PicoGL.COMPRESSED_R11_EAC
          <li>PicoGL.COMPRESSED_SIGNED_R11_EAC
          <li>PicoGL.COMPRESSED_RG11_EAC
          <li>PicoGL.COMPRESSED_SIGNED_RG11_EAC
          <li>PicoGL.COMPRESSED_RGB8_ETC2
          <li>PicoGL.COMPRESSED_SRGB8_ETC2
          <li>PicoGL.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2
          <li>PicoGL.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2
          <li>PicoGL.COMPRESSED_RGBA8_ETC2_EAC
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC
        </ul>

        Note that while WEBGL_compressed_texture_etc1 is not enabled by this method,
        ETC1 textures can be loaded using COMPRESSED_RGB8_ETC2 as the format.

        @method
        @return {App} App 对象。
    */
    etcTextures() {
        let ext = this.gl.getExtension("WEBGL_compressed_texture_etc");
        this.etcTexturesEnabled = !!ext;

        if (this.etcTexturesEnabled) {
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_R11_EAC]                        = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SIGNED_R11_EAC]                 = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RG11_EAC]                       = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SIGNED_RG11_EAC]                = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGB8_ETC2]                      = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ETC2]                     = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2]  = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA8_ETC2_EAC]                 = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC]          = true;
        }

        return this;
    }

    /**
        启用 WEBGL_compressed_texture_astc 扩展。该扩展允许使用以下枚举的贴图格式：
        
        <ul>
          <li>PicoGL.COMPRESSED_RGBA_ASTC_4x4_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_5x4_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_5x5_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_6x5_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_6x6_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_8x5_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_8x6_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_8x8_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_10x5_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_10x6_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_10x8_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_10x10_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_12x10_KHR
          <li>PicoGL.COMPRESSED_RGBA_ASTC_12x12_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR
          <li>PicoGL.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR
        </ul>

        @method
        @return {App} App 对象。
    */
    astcTextures() {
        let ext = this.gl.getExtension("WEBGL_compressed_texture_astc");
        this.astcTexturesEnabled = !!ext;

        if (this.astcTexturesEnabled) {
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_4x4_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_5x4_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_5x5_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_6x5_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_6x6_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_8x5_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_8x6_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_8x8_KHR]           = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_10x5_KHR]          = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_10x6_KHR]          = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_10x8_KHR]          = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_10x10_KHR]         = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_12x10_KHR]         = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_ASTC_12x12_KHR]         = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR]   = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR]  = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR]  = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR]  = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR] = true;
        }
        
        return this;
    }

    /**
        启用 WEBGL_compressed_texture_pvrtc 扩展。该扩展允许使用以下枚举的贴图格式：

        <ul>
          <li>PicoGL.COMPRESSED_RGB_PVRTC_4BPPV1_IMG
          <li>PicoGL.COMPRESSED_RGB_PVRTC_2BPPV1_IMG
          <li>PicoGL.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
          <li>PicoGL.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG
        </ul>

        @method
        @return {App} App 对象。
    */
    pvrtcTextures() {
        let ext = this.gl.getExtension("WEBGL_compressed_texture_pvrtc");
        this.pvrtcTexturesEnabled = !!ext;
        
        if (this.pvrtcTexturesEnabled) {
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGB_PVRTC_2BPPV1_IMG] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG] = true;
            TEXTURE_FORMAT_DEFAULTS.COMPRESSED_TYPES[CONSTANTS.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG] = true;
        }

        return this;
    }

    /**
        从当前绑定的帧缓冲中读取一个像素的色值。

        @method
        @param {number} x The x coordinate of the pixel.
        @param {number} y The y coordinate of the pixel.
        @param {ArrayBufferView} outColor Typed array to store the pixel's color.
        @param {object} [options] Options.
        @param {GLEnum} [options.type=UNSIGNED_BYTE] Type of data stored in the read framebuffer.
        @param {GLEnum} [options.format=RGBA] Read framebuffer data format.
        @return {App} The App object.
    */
    readPixel(x, y, outColor, options = CONSTANTS.DUMMY_OBJECT) {
        let {
            format = CONSTANTS.RGBA,
            type = CONSTANTS.UNSIGNED_BYTE    
        } = options;
        
        this.gl.readPixels(x, y, 1, 1, format, type, outColor);

        return this;
    }

    /**
        设定视口大小。

        @method
        @param {number} x Left bound of the viewport rectangle.
        @param {number} y Lower bound of the viewport rectangle.
        @param {number} width Width of the viewport rectangle.
        @param {number} height Height of the viewport rectangle.
        @return {App} App 对象。
    */
    viewport(x, y, width, height) {

        if (this.viewportWidth !== width || this.viewportHeight !== height ||
                this.viewportX !== x || this.viewportY !== y) {
            this.viewportX = x;
            this.viewportY = y;
            this.viewportWidth = width;
            this.viewportHeight = height;
            this.gl.viewport(x, y, this.viewportWidth, this.viewportHeight);
        }

        return this;
    }

    /**
        设定视口大小与整个画布大小一致。

        @method
        @return {App} App 对象。
    */
    defaultViewport() {
        this.viewport(0, 0, this.width, this.height);

        return this;
    }

    /**
        调整绘图平面大小。

        @method
        @param {number} width 新的画布宽度。
        @param {number} height 新的画布高度。
        @return {App} App 对象。
    */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;

        this.width = this.gl.drawingBufferWidth;
        this.height = this.gl.drawingBufferHeight;
        this.viewport(0, 0, this.width, this.height);

        return this;
    }
    /**
        创建一个程序。

        @method
        @param {Shader|string} vertexShader 顶点着色器对象或源码。
        @param {Shader|string} fragmentShader 片元着色器对象或源码
        @param {Array} [xformFeedbackVars] Transform feedback varyings.
        @return {Program} 新的程序对象。
    */
    createProgram(vsSource, fsSource, xformFeedbackVars) {
        return new Program(this.gl, this.state, vsSource, fsSource, xformFeedbackVars);
    }

    /**
        创建一个着色器。使用 Program 创建着色器可以使着色器得到重用。

        @method
        @param {GLEnum} type 着色器类型。
        @param {string} source 着色器源码。
        @return {Shader} 新的着色器对象。
    */
    createShader(type, source) {
        return new Shader(this.gl, type, source);
    }

    /**
        创建一个顶点数组。

        @method
        @return {VertexArray} 新的顶点数组对象。
    */
    createVertexArray(numElements = 0, numInstances = 0) {
        return new VertexArray(this.gl, this.state, numElements, numInstances);
    }

    /**
        创建一个变换回传（Transform Feedback）对象。

        @method
        @return {TransformFeedback} 新的变换回传（Transform Feedback）对象。
    */
    createTransformFeedback() {
        return new TransformFeedback(this.gl, this.state);
    }

    /**
        创建一个顶点缓冲。

        @method
        @param {GLEnum} type 存储在顶点缓冲中的数据类型。
        @param {number} itemSize 每顶点元素数量。
        @param {ArrayBufferView|number} data Buffer data itself or the total 
            number of elements to be allocated.
        @param {GLEnum} [usage=STATIC_DRAW] 缓冲用途。
        @return {VertexBuffer} 新的顶点缓冲对象。
    */
    createVertexBuffer(type, itemSize, data, usage) {
        return new VertexBuffer(this.gl, this.state, type, itemSize, data, usage);
    }

    /**
        Create a per-vertex matrix buffer. Matrix buffers ensure that columns
        are correctly split across attribute locations.

        @method
        @param {GLEnum} type The data type stored in the matrix buffer. Valid types
        are FLOAT_MAT4, FLOAT_MAT4x2, FLOAT_MAT4x3, FLOAT_MAT3, FLOAT_MAT3x2,
        FLOAT_MAT3x4, FLOAT_MAT2, FLOAT_MAT2x3, FLOAT_MAT2x4.
        @param {ArrayBufferView} data Matrix buffer data.
        @param {GLEnum} [usage=STATIC_DRAW] Buffer usage.
        @return {VertexBuffer} New VertexBuffer object.
    */
    createMatrixBuffer(type, data, usage) {
        return new VertexBuffer(this.gl, this.state, type, 0, data, usage);
    }

    /**
        创建索引缓冲。

        @method
        @param {GLEnum} type 存储在索引缓冲中的数据类型。
        @param {number} itemSize 每片元元素数量。
        @param {ArrayBufferView} data 索引缓冲数据。
        @param {GLEnum} [usage=STATIC_DRAW] 缓冲用途。
        @return {VertexBuffer} 新的索引缓冲对象。
    */
    createIndexBuffer(type, itemSize, data, usage) {
        return new VertexBuffer(this.gl, this.state, type, itemSize, data, usage, true);
    }

    /**
        创建一个 std140 布局的 uniform 缓冲。注意：FLOAT_MAT2, FLOAT_MAT3x2, FLOAT_MAT4x2,
        FLOAT_MAT3, FLOAT_MAT2x3, FLOAT_MAT4x3 都是支持的，但这些类型必须手动添加 4-float 列对齐。

        @method
        @param {Array} layout Array indicating the order and types of items to
                        be stored in the buffer.
        @param {GLEnum} [usage=DYNAMIC_DRAW] Buffer usage.
        @return {UniformBuffer} New UniformBuffer object.
    */
    createUniformBuffer(layout, usage) {
        return new UniformBuffer(this.gl, this.state, layout, usage);
    }

    /**
        创建一个 2D 贴图纹理。根据传入参数类型不同有多种使用方式：
        <ul>
            <li><b>app.createTexture2D(ImageElement, options)</b>: 从 DOM 图片元素对象创建贴图。
            <li><b>app.createTexture2D(TypedArray, width, height, options)</b>: 从类型化数组创建贴图。
            <li><b>app.createTexture2D(width, height, options)</b>: 创建一个空贴图。
        </ul>

        @method
        @param {DOMElement|ArrayBufferView|Array} [image] Image data. An array can be passed to manually set all levels 
            of the mipmap chain. If a single level is passed and mipmap filtering is being used,
            generateMipmap() will be called to produce the remaining levels.
        @param {number} [width] Texture width. Required for array or empty data.
        @param {number} [height] Texture height. Required for array or empty data.
        @param {Object} [options] Texture options.
        @param {GLEnum} [options.type] Type of data stored in the texture. Defaults to UNSIGNED_SHORT 
            if format is DEPTH_COMPONENT, UNSIGNED_BYTE otherwise.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {boolean} [options.flipY=false] Whether the y-axis should be flipped when unpacking the texture. 
        @param {boolean} [options.premultiplyAlpha=false] Whether the alpha channel should be pre-multiplied when unpacking the texture. 
        @param {GLEnum} [options.minFilter] Minification filter. Defaults to 
            LINEAR_MIPMAP_NEAREST if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.magFilter] Magnification filter. Defaults to LINEAR
            if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} [options.baseLevel] Base mipmap level.
        @param {GLEnum} [options.maxLevel] Maximum mipmap level.
        @param {GLEnum} [options.minLOD] Mimimum level of detail.
        @param {GLEnum} [options.maxLOD] Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated. Defaults to generating mipmaps if
            a mipmap sampling filter is used and the mipmap levels aren't provided directly.
        @return {Texture} New Texture object.
    */
    createTexture2D(image, width, height, options) {
        if (typeof image === "number") {
            // Create empty texture just give width/height.
            options = height;
            height = width;
            width = image;
            image = null;    
        } else if (height === undefined) {
            // Passing in a DOM element. Height/width not required.
            options = width;
            width = image.width;
            height = image.height;
        }

        return new Texture(this.gl, this.state, this.gl.TEXTURE_2D, image, width, height, undefined, false, options);
    }

    /**
        创建 2D 纹理数组。

        @method
        @param {ArrayBufferView|Array} image Pixel data. An array can be passed to manually set all levels 
            of the mipmap chain. If a single level is passed and mipmap filtering is being used,
            generateMipmap() will be called to produce the remaining levels.
        @param {number} width Texture width.
        @param {number} height Texture height.
        @param {number} size Number of images in the array.
        @param {Object} [options] Texture options.
         @param {GLEnum} [options.type] Type of data stored in the texture. Defaults to UNSIGNED_SHORT 
            if format is DEPTH_COMPONENT, UNSIGNED_BYTE otherwise.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {boolean} [options.flipY=false] Whether the y-axis should be flipped when unpacking the texture. 
        @param {GLEnum} [options.minFilter] Minification filter. Defaults to 
            LINEAR_MIPMAP_NEAREST if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.magFilter] Magnification filter. Defaults to LINEAR
            if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.wrapR=REPEAT] Depth wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} [options.baseLevel] Base mipmap level.
        @param {GLEnum} [options.maxLevel] Maximum mipmap level.
        @param {GLEnum} [options.minLOD] Mimimum level of detail.
        @param {GLEnum} [options.maxLOD] Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated. Defaults to generating mipmaps if
            a mipmap sampling filter is use and the mipmap levels aren't provided directly.
        @return {Texture} New Texture object.
    */
    createTextureArray(image, width, height, depth, options) {
        if (typeof image === "number") {
            // Create empty texture just give width/height/depth.
            options = depth;
            depth = height;
            height = width;
            width = image;
            image = null;    
        }
        return new Texture(this.gl, this.state, this.gl.TEXTURE_2D_ARRAY, image, width, height, depth, true, options);
    }

    /**
        创建 3D 贴图。

        @method
        @param {ArrayBufferView|Array} image Pixel data. An array can be passed to manually set all levels 
            of the mipmap chain. If a single level is passed and mipmap filtering is being used,
            generateMipmap() will be called to produce the remaining levels.
        @param {number} width Texture width.
        @param {number} height Texture height.
        @param {number} depth Texture depth.
        @param {Object} [options] Texture options.
        @param {GLEnum} [options.type] Type of data stored in the texture. Defaults to UNSIGNED_SHORT 
            if format is DEPTH_COMPONENT, UNSIGNED_BYTE otherwise.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {boolean} [options.flipY=false] Whether the y-axis should be flipped when unpacking the texture. 
        @param {GLEnum} [options.minFilter] Minification filter. Defaults to 
            LINEAR_MIPMAP_NEAREST if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.magFilter] Magnification filter. Defaults to LINEAR
            if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.wrapR=REPEAT] Depth wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} [options.baseLevel] Base mipmap level.
        @param {GLEnum} [options.maxLevel] Maximum mipmap level.
        @param {GLEnum} [options.minLOD] Mimimum level of detail.
        @param {GLEnum} [options.maxLOD] Maximum level of detail.
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated. Defaults to generating mipmaps if
            a mipmap sampling filter is use and the mipmap levels aren't provided directly.
        @return {Texture} New Texture object.
    */
    createTexture3D(image, width, height, depth, options) {
        if (typeof image === "number") {
            // 创建一个空贴图并设定宽高和深度。
            options = depth;
            depth = height;
            height = width;
            width = image;
            image = null;    
        }
        return new Texture(this.gl, this.state, this.gl.TEXTURE_3D, image, width, height, depth, true, options);
    }

    /**
        创建一个 Cubemap（立方体贴图纹理）。

        @method
        @param {Object} options 贴图选项。
        @param {DOMElement|ArrayBufferView} [options.negX] 负X方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posX] 正X方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.negY] 负Y方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posY] 正Y方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.negZ] 负Z方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {DOMElement|ArrayBufferView} [options.posZ] 正Z方向的图像数据。
                可以是能够被 texImage2D 接受的任何类型。
        @param {number} [options.width] Cubemap side width. Defaults to the width of negX if negX is an image.
        @param {number} [options.height] Cubemap side height. Defaults to the height of negX if negX is an image.
        @param {GLEnum} [options.type] Type of data stored in the texture. Defaults to UNSIGNED_SHORT 
            if format is DEPTH_COMPONENT, UNSIGNED_BYTE otherwise.
        @param {GLEnum} [options.format=RGBA] Texture data format.
        @param {GLEnum} [options.internalFormat=RGBA] Texture data internal format.
        @param {boolean} [options.flipY=false] Whether the y-axis should be flipped when unpacking the image. 
        @param {boolean} [options.premultiplyAlpha=false] Whether the alpha channel should be pre-multiplied when unpacking the image. 
        @param {GLEnum} [options.minFilter] Minification filter. Defaults to 
            LINEAR_MIPMAP_NEAREST if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.magFilter] Magnification filter. Defaults to LINEAR
            if image data is provided, NEAREST otherwise.
        @param {GLEnum} [options.wrapS=REPEAT] Horizontal wrap mode.
        @param {GLEnum} [options.wrapT=REPEAT] Vertical wrap mode.
        @param {GLEnum} [options.compareMode=NONE] Comparison mode.
        @param {GLEnum} [options.compareFunc=LEQUAL] Comparison function.
        @param {GLEnum} [options.baseLevel] 最小 mipmap 等级。
        @param {GLEnum} [options.maxLevel] 最大 mipmap 等级。
        @param {GLEnum} [options.minLOD] 最小 LOD 细节等级。
        @param {GLEnum} [options.maxLOD] 最大 LOD 细节等级。
        @param {boolean} [options.generateMipmaps] Should mipmaps be generated. Defaults to generating mipmaps if
            a mipmap sampling filter is usedd.
        @return {Cubemap} 新的立方体贴图纹理对象
    */
    createCubemap(options) {
        return new Cubemap(this.gl, this.state, options);
    }

    /**
        创建一个渲染缓冲。

        @method
        @param {number} width 渲染缓冲宽度。
        @param {number} height 渲染缓冲高度。
        @param {GLEnum} internalFormat 渲染缓冲数据的内部排列方式。
        @param {number} [samples=0] MSAA 采样数。
        @return {Renderbuffer} 新的渲染缓冲对象。
    */
    createRenderbuffer(width, height, internalFormat, samples = 0) {
        return new Renderbuffer(this.gl, width, height, internalFormat, samples);
    }

    /**
        创建一个帧缓冲。

        @method
        @return {Framebuffer} 新的帧缓冲对象。
    */
    createFramebuffer() {
        return new Framebuffer(this.gl, this.state);
    }

    /**
        创建一个查询。

        @method
        @param {GLEnum} target 需要查询的信息。
        @return {Query} 新的查询对象。
    */
    createQuery(target) {
        return new Query(this.gl, target);
    }

    /**
        创建一个 Timer。

        @method
        @return {Timer} 新的 Timer 对象。
    */
    createTimer() {
        return new Timer(this.gl);
    }

    /**
        创建 DrawCall。每个 DrawCall 对象管理一次 WebGL DrawCall 关
        联的 attributes、uniforms 和 textures 的程序和值。

        @method
        @param {Program} program 本次 DrawCall 使用的程序。
        @param {VertexArray} vertexArray 绘制使用的顶点数组。
        @param {GLEnum} [primitive=TRIANGLES] 绘制的片元类型。
        @return {DrawCall} 新的 DrawCall 对象。
    */
    createDrawCall(program, vertexArray, primitive) {
        return new DrawCall(this.gl, this.state, program, vertexArray, primitive);
    }

}

module.exports = App;
