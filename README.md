PicoGL.js
========

[![Build Status](https://travis-ci.org/tsherif/picogl.js.svg?branch=master)](https://travis-ci.org/tsherif/picogl.js) [![GZIP size](https://badge-size.herokuapp.com/tsherif/picogl.js/master/build/picogl.min.js.svg?compression=gzip)](https://github.com/tsherif/picogl.js/blob/master/build/picogl.min.js) [![Gitter](https://img.shields.io/gitter/room/picogl.js/general.svg)](https://gitter.im/picogl-js/general) [![License](https://img.shields.io/github/license/tsherif/picogl.js.svg)](https://github.com/tsherif/picogl.js/blob/master/LICENSE) [![NPM](https://img.shields.io/npm/v/picogl.svg)](https://www.npmjs.com/package/picogl)

**[API 中文文档](https://soulgem.cc/picogl.js/docs/PicoGL.html)** | **[Tutorial](https://tsherif.wordpress.com/2017/07/26/webgl-2-development-with-picogl-js/)** | **[Chat](https://gitter.im/picogl-js/general)**

PicoGL.js 是基于 WebGL 2 的最小渲染库。它能够为熟悉 WebGL 2 渲染管线的开发者提供更方便的API。PicoGL.js 的典型用途是参与创建程序（Program）、顶点缓冲（Vertex Buffer）、顶点数组（Vertex Array）、Uniform Buffers、 帧缓冲（Framebuffers）、纹理（Textures）、变换回传（Transform Feedbacks）、以及将他们合并为 DrawCall。

```JavaScript

    // 创建管理所有 GL 状态的 App
    var app = PicoGL.createApp(canvas)
    .clearColor(0.0, 0.0, 0.0, 1.0);
    
    // 创建 Program
    var program = app.createProgram(vertexShaderSource, fragmentShaderSource);

    // Create a buffer of vertex attributes
    var positions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
         0.0,  0.5
    ]));

    // VertexArray manages attribute buffer state
    var vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, positions);

    // UniformBuffer allows multiple uniforms to be bound
    // as a single block of memory.
    // First part defines layout of the UniformBuffer.
    // Second part updates values.
    var uniformBuffer = app.createUniformBuffer([
        PicoGL.FLOAT_VEC4,
        PicoGL.FLOAT_VEC4
    ])
    .set(0, new Float32Array([1.0, 0.0, 0.0, 0.3]))
    .set(1, new Float32Array([0.0, 0.0, 1.0, 0.7]))
    .update();

    // Create DrawCall from Program and VertexArray (both required),
    // and a UniformBuffer.
    var drawCall = app.createDrawCall(program, vertexArray)
    .uniformBlock("ColorUniforms", uniformBuffer);

    // Draw
    app.clear();
    drawCall.draw();

``` 

注意：PicoGL.js **不是**场景图渲染库。这里没有 Objects、Hierarchies、Transforms、Materials 等对象。它只是设计用来更方便地管理GPU状态。它的概念模型可以映射到使用 WenGL 2 API 直接编写的结构上。它唯一的高阶结构是用来管理一系列相关低阶结构的 **DrawCall**。



使用方法
-----
可以直接下载PicoGL.js 的 [built source](https://tsherif.github.io/picogl.js/build/picogl.min.js) ，并通过 script 标签加载：

```HTML
    <script src="js/picogl.min.js"></script>
```

或者通过 [npm](https://www.npmjs.com/package/picogl) 安装：

```bash
    npm install picogl
```

然后用 CommonJS 风格的 `require` 导入：

```JavaScript
    var PicoGL = require("picogl");
```

特性
--------

PicoGL.js 简化了 WebGL 2 特性复杂的用法。例如多渲染目标(MRT)、Uniform Buffers、变换回传（Transform Feedback）和实例化渲染（Instanced Drawing）。

**多渲染目标（Multiple Render Targets）**

```JavaScript
    var app = PicoGL.createApp(canvas)
    .clearColor(0.0, 0.0, 0.0, 1.0);


    // Texture render targets
    var colorTarget0 = app.createTexture2D(app.width, app.height);
    var colorTarget1 = app.createTexture2D(app.width, app.height);
    var depthTarget = app.createTexture2D(app.width, app.height, {
        format: PicoGL.DEPTH_COMPONENT
    });


    // Create framebuffer with color targets at attachments 
    // 0 and 1, and a depth target.
    var framebuffer = app.createFramebuffer()
    .colorTarget(0, colorTarget0)
    .colorTarget(1, colorTarget1)
    .depthTarget(depthTarget);
    
    // ... set up programs and vertex arrays for offscreen and
    // main draw passes...
    
    var offscreenDrawCall = app.createDrawCall(offscreenProgram, offscreenVAO);

    // Bind main program texture samplers to framebuffer targets
    var mainDrawCall = app.createDrawCall(mainProgram, mainVAO)
    .texture("texture1", framebuffer.colorAttachments[0])
    .texture("texture2", framebuffer.colorAttachments[1])
    .texture("depthTexture", framebuffer.depthAttachment);

    // Offscreen pass
    app.drawFramebuffer(framebuffer).clear();
    offscreenDrawCall.draw();
    
    // Main draw pass
    app.defaultDrawFramebuffer().clear()
    mainDrawCall.draw();
```

**Uniform Buffers**

```JavaScript
    var app = PicoGL.createApp(canvas)
    .clearColor(0.0, 0.0, 0.0, 1.0);
    
    // ... set up program and vertex array...

    // Layout is std140
    var uniformBuffer = app.createUniformBuffer([
        PicoGL.FLOAT_MAT4,
        PicoGL.FLOAT_VEC4,
        PicoGL.INT_VEC4,
        PicoGL.FLOAT
    ])
    .set(0, matrix)
    .set(1, float32Vector)
    .set(2, int32Vector)
    .set(3, scalar)
    .update();      // Data only sent to GPU when update() is called

    var drawCall = app.createDrawCall(program, vertexArray)
    .uniformBlock("UniformBlock", uniformBuffer);
```

**变换回传（Transform Feedback）**

```JavaScript
    var app = PicoGL.createApp(canvas)
    .clearColor(0.0, 0.0, 0.0, 1.0);

    // Last argument is transform feedback varyings
    var program = app.createProgram(vertexShaderSource, fragmentShaderSource, ["vPosition"]);

    var positions1 = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
         0.0,  0.5
    ]));
    var vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, positions1);

    // Empty destination buffer of 6 floats
    var positions2 = app.createVertexBuffer(PicoGL.FLOAT, 2, 6);  

    // Capture transform results into positions2 buffer
    var transformFeedback = app.createTransformFeedback()
    .feedbackBuffer(0, positions2);

    var drawCall = app.createDrawCall(program, vertexArray)
    .transformFeedback(transformFeedback);

    app.clear();
    drawCall.draw();

``` 

**实例化渲染（Instanced Drawing）**

```JavaScript
    var app = PicoGL.createApp(canvas)
    .clearColor(0.0, 0.0, 0.0, 1.0);

    var program = app.createProgram(vertexShaderSource, fragmentShaderSource);

    // The starting positions of the triangle. Each pair of coordinates
    // will be passed per-vertex
    var positions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
        -0.3, -0.3,
         0.3, -0.3,
         0.0,  0.3
    ]));

    // This is an instance buffer meaning each pair of numbers will be passed
    // per-instance, rather than per-vertex
    var offsets = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
        -0.5, 0.0,
         0.0, 0.2,
         0.5, 0.0
    ]));

    // This vertex array is set up to draw 3 instanced triangles 
    // with the offsets given above
    var vertexArray = app.createVertexArray()
    .vertexAttributeBuffer(0, positions); // Pass positions per-vertex
    .instanceAttributeBuffer(1, offset); // Pass offsets per-instance
```
