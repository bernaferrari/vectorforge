"use client"

import React, { useState } from "react"
import { Download, Video, Check, Copy, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTheme } from "next-themes"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExportGltf: () => void
  onExportVideo: () => Promise<void>
  // parameters to populate dynamic code generators
  materialPreset: string
  colorA: string
  colorB: string
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  layerSpacing: number
  transitionType: string
  ambientIntensity: number
  keyLightIntensity: number
  rimLightIntensity: number
  svgPathA: string
  svgPathB: string
}

type ExportTab = "options" | "r3f" | "android"

const isExportTab = (value: string): value is ExportTab =>
  value === "options" || value === "r3f" || value === "android"

const CodeBlock = ({
  code,
  lang,
  className,
}: {
  code: string
  lang: string
  className?: string
}) => {
  const { resolvedTheme } = useTheme()
  const [html, setHtml] = useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setHtml(null)
    void import("shiki")
      .then(({ codeToHtml }) =>
        codeToHtml(code, {
          lang,
          theme: resolvedTheme === "light" ? "github-light" : "github-dark",
        })
      )
      .then((nextHtml) => {
        if (!cancelled) setHtml(nextHtml)
      })
      .catch(() => {
        if (!cancelled) setHtml(null)
      })
    return () => {
      cancelled = true
    }
  }, [code, lang, resolvedTheme])

  const surfaceClass = `block max-h-[56vh] w-full max-w-full overflow-auto rounded-lg border border-border bg-muted/35 font-mono text-[11px] leading-relaxed text-muted-foreground ${className ?? ""}`

  if (!html) {
    return (
      <pre className={`${surfaceClass} p-4`}>
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div
      className={`${surfaceClass} [&_pre]:m-0 [&_pre]:min-w-max [&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:leading-relaxed`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportGltf,
  onExportVideo,
  materialPreset,
  colorA,
  colorB,
  roughness,
  metalness,
  reflectance,
  clearcoat,
  clearcoatRoughness,
  transmission,
  thickness,
  emissiveIntensity,
  extrusionDepth,
  bevelEnabled,
  bevelThickness,
  bevelSize,
  bevelSegments,
  layerSpacing,
  transitionType: _transitionType,
  ambientIntensity,
  keyLightIntensity,
  rimLightIntensity,
  svgPathA,
  svgPathB,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>("options")
  const [isRecording, setIsRecording] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Generate dynamic React Three Fiber code template
  const generateR3fCode = () => {
    const escA = svgPathA.replace(/`/g, "\\`").trim()
    const escB = svgPathB.replace(/`/g, "\\`").trim()

    return `'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

interface ExtrudedIconProps {
  progress?: number; // 0 to 1
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0e0b16' }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 40 }}
        shadows
        gl={{ localClippingEnabled: true }}
      >
        <ambientLight intensity={${ambientIntensity}} />
        <directionalLight position={[5, 5, 4]} intensity={${keyLightIntensity}} castShadow />
        <directionalLight position={[-6, -3, 3]} intensity={${rimLightIntensity}} />
        <Center>
          <ExtrudedIcon progress={0.5} />
        </Center>
      </Canvas>
    </div>
  );
}

function ExtrudedIcon({ progress = 0 }: ExtrudedIconProps) {
  const svgAContent = \`${escA}\`;
  const svgBContent = \`${escB}\`;
  
  // Custom SVGLoader Parser
  const [geometryA, geometryB] = useMemo(() => {
    const loader = new SVGLoader();
    const parsedA = loader.parse(svgAContent);
    const parsedB = loader.parse(svgBContent);
    
    const geomA = parsedA.paths.flatMap((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      return shapes.map(shape => new THREE.ExtrudeGeometry(shape, {
        depth: ${extrusionDepth} + i * ${layerSpacing} * 0.1,
        bevelEnabled: ${bevelEnabled},
        bevelThickness: ${bevelThickness},
        bevelSize: ${bevelSize},
        bevelSegments: ${bevelSegments},
        curveSegments: 16
      }));
    });

    const geomB = parsedB.paths.flatMap((path, i) => {
      const shapes = SVGLoader.createShapes(path);
      return shapes.map(shape => new THREE.ExtrudeGeometry(shape, {
        depth: ${extrusionDepth} + i * ${layerSpacing} * 0.1,
        bevelEnabled: ${bevelEnabled},
        bevelThickness: ${bevelThickness},
        bevelSize: ${bevelSize},
        bevelSegments: ${bevelSegments},
        curveSegments: 16
      }));
    });

    return [geomA, geomB];
  }, []);

  // Material tuning based on: ${materialPreset}
  const materialA = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '${colorA}',
    roughness: ${roughness},
    metalness: ${metalness},
    reflectivity: ${reflectance},
    envMapIntensity: ${reflectance},
    clearcoat: ${clearcoat},
    clearcoatRoughness: ${clearcoatRoughness},
    transmission: ${transmission},
    thickness: ${thickness},
    emissive: ${emissiveIntensity} > 0 ? new THREE.Color('${colorA}') : new THREE.Color('#000000'),
    emissiveIntensity: ${emissiveIntensity},
    transparent: true,
    opacity: 1 - progress
  }), [progress]);

  const materialB = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '${colorB}',
    roughness: ${roughness},
    metalness: ${metalness},
    reflectivity: ${reflectance},
    envMapIntensity: ${reflectance},
    clearcoat: ${clearcoat},
    clearcoatRoughness: ${clearcoatRoughness},
    transmission: ${transmission},
    thickness: ${thickness},
    emissive: ${emissiveIntensity} > 0 ? new THREE.Color('${colorB}') : new THREE.Color('#000000'),
    emissiveIntensity: ${emissiveIntensity},
    transparent: true,
    opacity: progress
  }), [progress]);

  return (
    <group scale={[0.12, -0.12, 0.12]}>
      {/* Icon A Group */}
      {geometryA.map((geom, idx) => (
        <mesh key={\`a-\${idx}\`} geometry={geom} material={materialA} castShadow receiveShadow />
      ))}
      
      {/* Icon B Group */}
      {geometryB.map((geom, idx) => (
        <mesh key={\`b-\${idx}\`} geometry={geom} material={materialB} castShadow receiveShadow />
      ))}
    </group>
  );
}
`
  }

  const generateAndroidGradleCode = () => `dependencies {
    implementation("com.google.android.filament:filament-android:<filament-version>")
    implementation("com.google.android.filament:gltfio-android:<filament-version>")
    implementation("com.google.android.filament:filament-utils-android:<filament-version>")
}`

  // Generate an Android Filament loader for the exported glTF asset.
  const generateAndroidFilamentCode = () => {
    return `package com.example.icon3d

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
  }

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#7c5cff", "#ff5b9a", "#ffd700"],
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleVideoExport = async () => {
    if (isRecording) return
    try {
      setIsRecording(true)
      await onExportVideo()
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#4ee2a3", "#7c5cff", "#ffffff"],
      })
    } finally {
      setIsRecording(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100vh-40px)] w-[640px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-[640px]">
        <DialogHeader className="border-b border-border px-4 py-3 pr-11">
          <DialogTitle className="text-sm font-semibold text-foreground">
            Export
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isExportTab(value)) setActiveTab(value)
          }}
          className="min-h-0 min-w-0 gap-0"
        >
          <div className="border-b border-border px-4 py-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="options">Assets</TabsTrigger>
              <TabsTrigger value="r3f">React</TabsTrigger>
              <TabsTrigger value="android">Android</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden bg-background">
            <TabsContent value="options" className="min-w-0 p-4 outline-none">
              <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-muted/35">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                    <Box className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground">
                      3D model
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Export the current icon as a Filament-ready binary glTF
                      asset.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="shrink-0 gap-1.5"
                    onClick={onExportGltf}
                  >
                    <Download className="size-3.5" />
                    GLB
                  </Button>
                </div>

                <div className="flex items-center gap-3 p-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${
                      isRecording
                        ? "border-red-500/25 bg-red-500/10 text-red-500"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    <Video
                      className={`size-4 ${isRecording ? "animate-pulse" : ""}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground">
                      Video
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Render the full timeline from 0s to the end as a WebM
                      video.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={isRecording}
                    onClick={handleVideoExport}
                    className="shrink-0 gap-1.5"
                  >
                    <Video className="size-3.5" />
                    {isRecording ? "Rendering" : "WebM"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="r3f"
              className="relative min-w-0 p-4 outline-none"
            >
              <div className="absolute top-6 right-6 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted"
                  onClick={() => handleCopyCode(generateR3fCode())}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {isCopied ? "Copied!" : "Copy Code"}
                </Button>
              </div>
              <CodeBlock code={generateR3fCode()} lang="tsx" />
            </TabsContent>

            <TabsContent
              value="android"
              className="relative min-w-0 p-4 outline-none"
            >
              <div className="absolute top-6 right-6 z-10">
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-border bg-background/90 text-foreground shadow-sm hover:bg-muted"
                  onClick={() =>
                    handleCopyCode(
                      `${generateAndroidGradleCode()}\n\n${generateAndroidFilamentCode()}`
                    )
                  }
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {isCopied ? "Copied!" : "Copy Code"}
                </Button>
              </div>
              <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                Place the exported GLB at{" "}
                <span className="font-mono text-foreground">
                  app/src/main/assets/exports/icon.glb
                </span>
                .
              </div>
              <div className="flex max-h-[52vh] min-w-0 flex-col gap-3 overflow-auto">
                <div className="min-w-0">
                  <div className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Gradle
                  </div>
                  <CodeBlock
                    code={generateAndroidGradleCode()}
                    lang="kotlin"
                    className="max-h-none"
                  />
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Kotlin
                  </div>
                  <CodeBlock
                    code={generateAndroidFilamentCode()}
                    lang="kotlin"
                    className="max-h-none"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
