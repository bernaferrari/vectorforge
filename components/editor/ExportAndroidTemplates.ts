import type { ExportCodeTemplateParams } from "./ExportCodeTemplateModel"

export const generateAndroidGradleCode = () => `dependencies {
    implementation("com.google.android.filament:filament-android:<filament-version>")
    implementation("com.google.android.filament:gltfio-android:<filament-version>")
    implementation("com.google.android.filament:filament-utils-android:<filament-version>")
}`

export const generateAndroidFilamentCode = ({
  extrusionDepth,
  ambientIntensity,
  keyLightIntensity,
  rimLightIntensity,
}: ExportCodeTemplateParams) => `package com.example.icon3d

import android.content.Context
import android.view.Choreographer
import android.view.SurfaceView
import com.google.android.filament.Camera
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.IndirectLight
import com.google.android.filament.LightManager
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.Skybox
import com.google.android.filament.SwapChain
import com.google.android.filament.View
import com.google.android.filament.gltfio.AssetLoader
import com.google.android.filament.gltfio.FilamentAsset
import com.google.android.filament.gltfio.ResourceLoader
import com.google.android.filament.gltfio.UbershaderProvider
import com.google.android.filament.utils.Manipulator
import com.google.android.filament.utils.UiHelper
import java.nio.ByteBuffer

class FilamentIconView(context: Context) : SurfaceView(context), Choreographer.FrameCallback {
    private val engine: Engine = Engine.create()
    private val renderer: Renderer = engine.createRenderer()
    private val scene: Scene = engine.createScene()
    private val view: View = engine.createView()
    private val cameraEntity = EntityManager.get().create()
    private val camera: Camera = engine.createCamera(cameraEntity)
    private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
    private val manipulator = Manipulator.Builder()
        .targetPosition(0.0f, 0.0f, 0.0f)
        .orbitHomePosition(0.0f, 0.0f, 7.5f)
        .viewport(width.coerceAtLeast(1), height.coerceAtLeast(1))
        .build(Manipulator.Mode.ORBIT)

    private var swapChain: SwapChain? = null
    private var asset: FilamentAsset? = null
    private var lightEntity = 0

    init {
        view.scene = scene
        view.camera = camera
        view.blendMode = View.BlendMode.TRANSLUCENT
        view.renderQuality = view.renderQuality.apply { hdrColorBuffer = View.QualityLevel.HIGH }

        scene.skybox = Skybox.Builder().color(0.02f, 0.02f, 0.025f, 1.0f).build(engine)
        scene.indirectLight = IndirectLight.Builder()
            .intensity(${Math.round(ambientIntensity * 30000)})
            .build(engine)

        lightEntity = EntityManager.get().create()
        LightManager.Builder(LightManager.Type.DIRECTIONAL)
            .color(1.0f, 1.0f, 1.0f)
            .intensity(${Math.round(Math.max(keyLightIntensity, rimLightIntensity) * 50000)})
            .direction(-0.45f, -0.65f, -0.55f)
            .castShadows(true)
            .build(engine, lightEntity)
        scene.addEntity(lightEntity)

        uiHelper.renderCallback = object : UiHelper.RendererCallback {
            override fun onNativeWindowChanged(surface: android.view.Surface) {
                swapChain?.let(engine::destroySwapChain)
                swapChain = engine.createSwapChain(surface)
            }

            override fun onDetachedFromSurface() {
                swapChain?.let {
                    engine.destroySwapChain(it)
                    swapChain = null
                }
            }

            override fun onResized(width: Int, height: Int) {
                view.viewport = com.google.android.filament.Viewport(0, 0, width, height)
                camera.setProjection(40.0, width.toDouble() / height.coerceAtLeast(1), 0.05, 100.0, Camera.Fov.VERTICAL)
                manipulator.viewport(width, height)
            }
        }
        uiHelper.attachTo(this)

        loadModel("exports/icon.glb")
        Choreographer.getInstance().postFrameCallback(this)
    }

    private fun loadModel(assetPath: String) {
        val bytes = context.assets.open(assetPath).use { input ->
            ByteArray(input.available()).also { input.read(it) }
        }

        val materialProvider = UbershaderProvider(engine)
        val assetLoader = AssetLoader(engine, materialProvider, EntityManager.get())
        val resourceLoader = ResourceLoader(engine)
        val buffer = ByteBuffer.wrap(bytes)

        asset = assetLoader.createAsset(buffer)?.also { loaded ->
            resourceLoader.loadResources(loaded)
            loaded.releaseSourceData()
            loaded.root.transformToCenter(${String((-extrusionDepth / 2).toFixed(3))}f)
            scene.addEntities(loaded.entities)
        }
    }

    private fun Int.transformToCenter(zOffset: Float) {
        val transformManager = engine.transformManager
        val instance = transformManager.getInstance(this)
        transformManager.setTransform(instance, floatArrayOf(
            1.0f, 0.0f, 0.0f, 0.0f,
            0.0f, 1.0f, 0.0f, 0.0f,
            0.0f, 0.0f, 1.0f, 0.0f,
            0.0f, 0.0f, zOffset, 1.0f
        ))
    }

    override fun doFrame(frameTimeNanos: Long) {
        val cameraTransform = manipulator.getLookAt()
        camera.lookAt(
            cameraTransform.eye[0].toDouble(), cameraTransform.eye[1].toDouble(), cameraTransform.eye[2].toDouble(),
            cameraTransform.target[0].toDouble(), cameraTransform.target[1].toDouble(), cameraTransform.target[2].toDouble(),
            cameraTransform.up[0].toDouble(), cameraTransform.up[1].toDouble(), cameraTransform.up[2].toDouble()
        )

        swapChain?.let { chain ->
            if (renderer.beginFrame(chain, frameTimeNanos)) {
                renderer.render(view)
                renderer.endFrame()
            }
        }
        Choreographer.getInstance().postFrameCallback(this)
    }

    fun destroy() {
        Choreographer.getInstance().removeFrameCallback(this)
        uiHelper.detach()
        asset?.let {
            scene.removeEntities(it.entities)
            engine.destroyEntity(it.root)
        }
        scene.removeEntity(lightEntity)
        engine.destroyEntity(lightEntity)
        engine.destroyRenderer(renderer)
        engine.destroyView(view)
        engine.destroyScene(scene)
        engine.destroyCameraComponent(cameraEntity)
        EntityManager.get().destroy(cameraEntity)
        engine.destroy()
    }
}
`
