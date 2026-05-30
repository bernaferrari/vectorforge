"use client"

import { ExportModal } from "./ExportModal"
import { isInspectorInputDragActive } from "./InspectorControlModel"
import { AppTopBar } from "./AppTopBar"
import { ViewportStage } from "./ViewportStage"
import { TimelineDock } from "./TimelineDock"
import { useLightEditor } from "./useLightEditor"
import { useMaterialEditor } from "./useMaterialEditor"
import { useLayerEditor } from "./useLayerEditor"
import { useMorphRenderState } from "./useMorphRenderState"
import { useActiveTimelineValues } from "./useActiveTimelineValues"
import { useLinkedQualityKeyframes } from "./useLinkedQualityKeyframes"
import { InspectorSidebar } from "./InspectorSidebar"
import { useFillEditor } from "./useFillEditor"
import { useEditorShortcuts } from "./useEditorShortcuts"
import { useMotionPropertyControls } from "./useMotionPropertyControls"
import { useInspectorKeyframeControls } from "./useInspectorKeyframeControls"
import { useTimelineDockController } from "./useTimelineDockController"
import { useThemeControls } from "./useThemeControls"
import { useEditorSnapshotHistory } from "./useEditorSnapshotHistory"
import { useRecipeApplication } from "./useRecipeApplication"
import { useShapeSequenceEditor } from "./useShapeSequenceEditor"
import { useGeometryEditor } from "./useGeometryEditor"
import { useViewportOptions } from "./useViewportOptions"
import { useTransformEditor } from "./useTransformEditor"
import { useTimelineTracks } from "./useTimelineTracks"
import { useTimelineProps } from "./useTimelineProps"
import { useViewportStageProps } from "./useViewportStageProps"
import { ALL_LAYERS_ID } from "./SvgLayerModel"
import { useInspectorSidebarProps } from "./useInspectorSidebarProps"
import { useEditorPlaybackState } from "./useEditorPlaybackState"
import { useInitialRecipeBoot } from "./useInitialRecipeBoot"
import { useEditorFileSurface } from "./useEditorFileSurface"
import { useEditorSelectionNavigation } from "./useEditorSelectionNavigation"
import { useShapeNavigation } from "./useShapeNavigation"
import { useExportSceneSnapshot } from "./useExportSceneSnapshot"

export default function AppLayout() {
  const { themeMounted, isLightTheme, themeToggleLabel, setTheme } =
    useThemeControls()

  const {
    canvas3DRef,
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    loop,
    setLoop,
    isPreviewModelReady,
    setIsPreviewModelReady,
    exportTimelineVideo,
    stopPlayback,
    togglePlayback: handlePlayToggle,
    resetPlayback: handleReset,
    animatedSeekEnabled,
    setAnimatedSeekEnabled,
    cancelAnimatedSeek,
    seekToTime,
  } = useEditorPlaybackState()

  const {
    shapes,
    setShapes,
    selectedShapeId,
    setSelectedShapeId,
    openShapePicker,
    setOpenShapePicker,
    activeRecipeId,
    setActiveRecipeId,
    markCustom,
    setShapeIcon,
    setShapeWipePair,
    addShapeAtPlayhead,
    removeShape,
  } = useShapeSequenceEditor({ currentTime, duration })

  const {
    wireframe,
    extrusionDepth,
    setExtrusionDepth,
    bevelEnabled,
    setBevelEnabled,
    bevelThickness,
    setBevelThickness,
    bevelSize,
    setBevelSize,
    bevelSegments,
    setBevelSegments,
    geometryQuality,
    setGeometryQuality,
    qualityKeyframes,
    setQualityKeyframes,
    layerSpacing,
    setLayerSpacing,
    innerElementScale,
    setInnerElementScale,
    innerScaleKeyframes,
    setInnerScaleKeyframes,
  } = useGeometryEditor()
  const {
    objectScale,
    setObjectScale,
    objectScaleAxes,
    setObjectScaleAxes,
    moveOffset,
    setMoveOffset,
    moveKeyframes,
    setMoveKeyframes,
    rotationOffset,
    setRotationOffset,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    previewRotationY,
    setPreviewRotationY,
    isScaleLocked,
    setIsScaleLocked,
  } = useTransformEditor()

  const {
    enableGradient,
    fillMode,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    setFillKeyframes,
    restoreFillState,
    applyRecipeFill,
    setGradientEnabled,
    updateFillColor,
    updateGradientType,
    updateFillStops,
  } = useFillEditor({
    currentTime,
    duration,
    onEdit: markCustom,
  })
  const {
    zoom,
    setZoom,
    viewInertiaEnabled,
    setViewInertiaEnabled,
    showCenterPoint,
    setShowCenterPoint,
    showTransformGizmo,
    setShowTransformGizmo,
    zenMode,
    setZenMode,
    isDragging,
    setIsDragging,
  } = useViewportOptions()

  const {
    materialPreset,
    setMaterialPreset,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    materialKeyframes,
    setMaterialKeyframes,
    isAdvancedMaterialOpen,
    setIsAdvancedMaterialOpen,
    activeMaterialSettings,
    setMaterialBaseSettings,
    updateMaterialSetting,
    applyMaterialPreset,
  } = useMaterialEditor({
    currentTime,
    duration,
    onEdit: markCustom,
  })
  const {
    ambientColor,
    ambientIntensity,
    keyLightColor,
    setKeyLightColor,
    keyLightIntensity,
    setKeyLightIntensity,
    keyLightPosition,
    setKeyLightPosition,
    keyLightSoftness,
    setKeyLightSoftness,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    activeKeyLightPosition,
    lightPositionKeyframeAtPlayhead,
    toggleLightPositionKeyframeAtPlayhead,
    updateLightPositionXY,
    rimLightColor,
    rimLightIntensity,
  } = useLightEditor({
    currentTime,
    duration,
    onEdit: markCustom,
  })
  const {
    inspectorRefs,
    selectedMotionTrackId,
    setSelectedMotionTrackId,
    selectTimelineTrack,
    selectTimelinePropertyRow,
  } = useEditorSelectionNavigation({
    setAdvancedMaterialOpen: setIsAdvancedMaterialOpen,
    setSelectedShapeId,
  })

  const { tracks, setTracks, extrusionTrack, scaleTrack, lightingTrack } =
    useTimelineTracks()

  const applyRecipe = useRecipeApplication({
    duration,
    setActiveRecipeId,
    setMaterialPreset,
    applyRecipeFill,
    setShapes,
    setMaterialBaseSettings,
    setExtrusionDepth,
    setBevelEnabled,
    setBevelThickness,
    setBevelSize,
    setBevelSegments,
    setGeometryQuality,
    setLayerSpacing,
    setInnerElementScale,
    setRotationOffset,
    setRotationAxisKeyframes,
    setObjectScale,
    setMoveOffset,
    setMoveKeyframes,
    setQualityKeyframes,
    setInnerScaleKeyframes,
    setKeyLightIntensity,
    setKeyLightPosition,
    setKeyLightSoftness,
    setKeyLightPositionKeyframes,
    setTracks,
    setSelectedMotionTrackId,
    setCurrentTime,
    setIsPlaying,
  })

  useInitialRecipeBoot({
    applyRecipe,
    setShapes,
    setSelectedShapeId,
  })

  const { undo: undoLastEditorChange, redo: redoLastEditorChange } =
    useEditorSnapshotHistory({
      activeRecipeId,
      setActiveRecipeId,
      shapes,
      setShapes,
      setSelectedShapeId,
      setOpenShapePicker,
      duration,
      setDuration,
      setCurrentTime,
      materialPreset,
      setMaterialPreset,
      roughness,
      metalness,
      reflectance,
      clearcoat,
      clearcoatRoughness,
      transmission,
      thickness,
      emissiveIntensity,
      materialKeyframes,
      setMaterialKeyframes,
      setMaterialBaseSettings,
      extrusionDepth,
      setExtrusionDepth,
      bevelEnabled,
      setBevelEnabled,
      bevelThickness,
      setBevelThickness,
      bevelSize,
      setBevelSize,
      bevelSegments,
      setBevelSegments,
      geometryQuality,
      setGeometryQuality,
      qualityKeyframes,
      setQualityKeyframes,
      layerSpacing,
      setLayerSpacing,
      innerElementScale,
      setInnerElementScale,
      innerScaleKeyframes,
      setInnerScaleKeyframes,
      objectScale,
      setObjectScale,
      objectScaleAxes,
      setObjectScaleAxes,
      moveOffset,
      setMoveOffset,
      moveKeyframes,
      setMoveKeyframes,
      enableGradient,
      fillMode,
      fillColor,
      fillColorSecondary,
      fillGradientType,
      fillStops,
      fillKeyframes,
      restoreFillState,
      rotationOffset,
      setRotationOffset,
      rotationAxisKeyframes,
      setRotationAxisKeyframes,
      setPreviewRotationY,
      keyLightColor,
      setKeyLightColor,
      keyLightIntensity,
      setKeyLightIntensity,
      keyLightPosition,
      setKeyLightPosition,
      keyLightSoftness,
      setKeyLightSoftness,
      keyLightPositionKeyframes,
      setKeyLightPositionKeyframes,
      tracks,
      setTracks,
      setIsPlaying,
      isInputDragActive: isInspectorInputDragActive,
    })

  // --- Derived morph state: which two shapes surround the playhead, and the blend between them ---
  const {
    sortedShapes,
    morph,
    selectedShapeFill,
    selectedShapeFillSecondary,
    selectedShapeGradientType,
    selectedShapeFillStops,
    iconAContent,
    iconBContent,
    colorA,
    renderColorASecondary,
    renderColorAStops,
    renderColorB,
    renderColorBSecondary,
    renderColorBStops,
    activeTransitionProgress,
    transitionType,
    wipeDirection,
    renderEnableGradient,
    renderGradientType,
  } = useMorphRenderState({
    shapes,
    currentTime,
    fillColor,
    fillColorSecondary,
    fillGradientType,
    fillStops,
    fillKeyframes,
    fillMode,
    enableGradient,
  })
  const {
    layers: selectedShapeLayers,
    selectedLayer,
    selectedLayerId,
    selectedLayerOverride,
    setSelectedLayerId,
    updateSelectedLayerScale,
    updateSelectedLayerDepth,
    toggleSelectedLayerVisibility,
  } = useLayerEditor({
    shapes,
    selectedShapeId,
    setShapes,
    onEdit: markCustom,
  })
  const shapeNavigation = useShapeNavigation({
    sortedShapes,
    selectedShapeId,
    setSelectedShapeId,
    setSelectedLayerId,
  })

  const {
    activeExtrusionDepth,
    activeRotationOffset,
    activeObjectScale,
    activeMoveOffset,
    activeKeyLightIntensity,
    activeGeometryQuality,
    activeInnerScale,
  } = useActiveTimelineValues({
    currentTime,
    extrusionTrack,
    scaleTrack,
    lightingTrack,
    extrusionDepth,
    rotationOffset,
    rotationAxisKeyframes,
    previewRotationY,
    objectScale,
    moveOffset,
    moveKeyframes,
    keyLightIntensity,
    geometryQuality,
    qualityKeyframes,
    innerElementScale,
    innerScaleKeyframes,
  })

  const {
    handleDepthChange,
    handleRotationAxisChange,
    handleScaleChange,
    handleScaleAxisChange,
    handleViewRotationCommit,
    handleViewRotationSet,
    handleBrightnessChange,
    updateMoveAxis,
    updateQuality,
    resetView,
  } = useMotionPropertyControls({
    currentTime,
    duration,
    tracks,
    setTracks,
    setSelectedMotionTrackId,
    setActiveRecipeId,
    setExtrusionDepth,
    setRotationOffset,
    activeRotationOffset,
    setRotationAxisKeyframes,
    setPreviewRotationY,
    setObjectScale,
    setObjectScaleAxes,
    setIsScaleLocked,
    activeMoveOffset,
    setMoveOffset,
    setMoveKeyframes,
    setKeyLightIntensity,
    setGeometryQuality,
    setQualityKeyframes,
    canvas3DRef,
  })

  useLinkedQualityKeyframes({
    tracks,
    geometryQuality,
    setQualityKeyframes,
  })

  const {
    renderKeyframeControl,
    renderLightPositionKeyframeControl,
    renderStyleKeyframeControl,
    renderTransformKeyframeControl,
  } = useInspectorKeyframeControls({
    currentTime,
    duration,
    setTracks,
    setSelectedMotionTrackId,
    setActiveRecipeId,
    fillKeyframes,
    setFillKeyframes,
    materialKeyframes,
    setMaterialKeyframes,
    selectedShapeFillStops,
    selectedShapeGradientType,
    activeMaterialSettings,
    scaleTrack,
    activeObjectScale,
    activeRotationOffset,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    activeMoveOffset,
    moveKeyframes,
    setMoveKeyframes,
    keyLightPositionKeyframes,
    lightPositionKeyframeAtPlayhead,
    toggleLightPositionKeyframeAtPlayhead,
    markCustom,
    stopPlayback,
    setCurrentTime,
  })

  useEditorShortcuts({
    onUndo: undoLastEditorChange,
    onRedo: redoLastEditorChange,
    onPlayPause: handlePlayToggle,
  })

  const {
    timelinePropertyRows,
    previousBreakpoint,
    nextBreakpoint,
    atTimelineStart,
    atTimelineEnd,
    playbackProgress,
    goToPreviousBreakpoint,
    goToNextBreakpoint,
    goToEnd,
    handleDurationChange,
    handleTracksChange,
    clearTimelineTrackRow,
    clearTimelinePropertyRow,
    removeTimelinePropertyKeyframe,
    moveTimelinePropertyKeyframe,
    setTimelinePropertyEasing,
    setShapeBlend,
  } = useTimelineDockController({
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    seekToTime,
    tracks,
    setTracks,
    sortedShapes,
    setShapes,
    fillKeyframes,
    setFillKeyframes,
    materialKeyframes,
    setMaterialKeyframes,
    keyLightPositionKeyframes,
    setKeyLightPositionKeyframes,
    rotationAxisKeyframes,
    setRotationAxisKeyframes,
    moveKeyframes,
    setMoveKeyframes,
    setQualityKeyframes,
    markCustom,
  })

  const handleScrubStart = () => {
    cancelAnimatedSeek()
    stopPlayback()
  }

  const {
    isExportOpen,
    openExport,
    closeExport,
    uploadFileRef,
    handleUploadInputChange,
    handleDropSvg,
    triggerShapeUpload,
  } = useEditorFileSurface({
    selectedShapeId,
    setShapes,
    markCustom,
  })
  const timelineProps = useTimelineProps({
    duration,
    onDurationChange: handleDurationChange,
    currentTime,
    onTimeChange: setCurrentTime,
    onScrubStart: handleScrubStart,
    isPlaying,
    isPreviewLoading: !isPreviewModelReady,
    loop,
    onLoopChange: setLoop,
    tracks,
    onTracksChange: handleTracksChange,
    propertyRows: timelinePropertyRows,
    onClearTrackKeyframes: clearTimelineTrackRow,
    onClearPropertyRow: clearTimelinePropertyRow,
    onRemovePropertyKeyframe: removeTimelinePropertyKeyframe,
    onMovePropertyKeyframe: moveTimelinePropertyKeyframe,
    onSetPropertyEasing: setTimelinePropertyEasing,
    activeTrackId: selectedMotionTrackId,
    onActiveTrackChange: selectTimelineTrack,
    onActivePropertyRowChange: selectTimelinePropertyRow,
    shapes,
    selectedShapeId,
    onSelectShape: setSelectedShapeId,
    onShapesChange: setShapes,
    onAddShape: addShapeAtPlayhead,
    onRemoveShape: removeShape,
    onShapeIconChange: setShapeIcon,
    onShapeWipePairChange: setShapeWipePair,
    onUploadShape: triggerShapeUpload,
    onShapeBlendChange: setShapeBlend,
    openShapePicker,
    onOpenShapePicker: setOpenShapePicker,
    markCustom,
  })
  const { canvasProps, viewOptionsProps, playbackProps } =
    useViewportStageProps({
      iconAContent,
      iconBContent,
      materialPreset,
      colorA,
      colorB: renderColorB,
      colorASecondary: renderColorASecondary,
      colorBSecondary: renderColorBSecondary,
      colorAStops: renderColorAStops,
      colorBStops: renderColorBStops,
      enableGradient: renderEnableGradient,
      gradientType: renderGradientType,
      activeMaterialSettings,
      wireframe,
      extrusionDepth: activeExtrusionDepth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
      geometryQuality: activeGeometryQuality,
      layerSpacing,
      innerElementScale: activeInnerScale,
      transitionType,
      wipeDirection,
      transitionProgress: activeTransitionProgress,
      rotationOffset: activeRotationOffset,
      objectScale: activeObjectScale,
      objectScaleAxes,
      moveOffset: activeMoveOffset,
      isPlaying,
      ambientColor,
      ambientIntensity,
      keyLightColor,
      keyLightIntensity: activeKeyLightIntensity,
      keyLightPosition: activeKeyLightPosition,
      keyLightSoftness,
      rimLightColor,
      rimLightIntensity,
      zoom,
      viewInertiaEnabled,
      showCenterPoint,
      showTransformGizmo,
      selectedLayerId:
        selectedLayerId === ALL_LAYERS_ID ? null : selectedLayerId,
      pathOverridesA: morph.from.pathOverrides,
      pathOverridesB: morph.to.pathOverrides,
      playbackProgress,
      atTimelineStart,
      atTimelineEnd,
      hasPreviousBreakpoint: previousBreakpoint !== undefined,
      hasNextBreakpoint: nextBreakpoint !== undefined,
      zenMode,
      onZoomChange: setZoom,
      onViewRotationCommit: handleViewRotationCommit,
      onViewRotationSet: handleViewRotationSet,
      onObjectScaleChange: handleScaleChange,
      onObjectScaleAxisChange: handleScaleAxisChange,
      onMoveOffsetChange: updateMoveAxis,
      onRotationAxisChange: handleRotationAxisChange,
      onModelReadyChange: setIsPreviewModelReady,
      onResetView: resetView,
      onViewInertiaChange: setViewInertiaEnabled,
      onShowCenterPointChange: setShowCenterPoint,
      onShowTransformGizmoChange: setShowTransformGizmo,
      animatedSeekEnabled,
      onAnimatedSeekChange: setAnimatedSeekEnabled,
      onResetPlayback: handleReset,
      onPreviousBreakpoint: goToPreviousBreakpoint,
      onPlayToggle: handlePlayToggle,
      onNextBreakpoint: goToNextBreakpoint,
      onGoToEnd: goToEnd,
      onExitZenMode: () => setZenMode(false),
      markCustom,
    })
  const { styleProps, geometryProps, transformProps, lightProps } =
    useInspectorSidebarProps({
      fillRef: inspectorRefs.fill,
      materialRef: inspectorRefs.material,
      materialPreset,
      materialKeyframeCount: materialKeyframes.length,
      activeMaterialSettings,
      isAdvancedMaterialOpen,
      selectedShapeFill,
      selectedShapeFillSecondary,
      selectedShapeGradientType,
      selectedShapeFillStops,
      fillMode,
      styleKeyframeControl: renderStyleKeyframeControl(),
      onFillColorChange: updateFillColor,
      onGradientToggle: setGradientEnabled,
      onGradientTypeChange: updateGradientType,
      onStopsChange: updateFillStops,
      onMaterialPresetChange: applyMaterialPreset,
      onAdvancedMaterialOpenChange: setIsAdvancedMaterialOpen,
      onMaterialSettingChange: updateMaterialSetting,
      extrusionRef: inspectorRefs.extrusion,
      selectedMotionTrackId,
      extrusionTrack,
      activeExtrusionDepth,
      extrusionDepth,
      activeGeometryQuality,
      bevelEnabled,
      bevelSegments,
      renderKeyframeControl,
      setSelectedMotionTrackId,
      onDepthChange: handleDepthChange,
      onBevelEnabledChange: setBevelEnabled,
      onBevelSegmentsChange: setBevelSegments,
      onQualityChange: updateQuality,
      onCustomEdit: markCustom,
      scaleRef: inspectorRefs.scale,
      rotationRef: inspectorRefs.rotation,
      moveRef: inspectorRefs.move,
      scaleTrack,
      activeObjectScale,
      objectScale,
      objectScaleAxes,
      isScaleLocked,
      rotationOffset: activeRotationOffset,
      rotationAxisKeyframes,
      moveKeyframesLength: moveKeyframes.length,
      activeMoveOffset,
      selectedShapeLayers,
      selectedLayer,
      selectedLayerId,
      selectedLayerOverride,
      shapeNavigation,
      transformKeyframeControl: renderTransformKeyframeControl(),
      onScaleLockChange: setIsScaleLocked,
      onScaleChange: handleScaleChange,
      onScaleAxisChange: handleScaleAxisChange,
      onRotationAxisChange: handleRotationAxisChange,
      onMoveAxisChange: updateMoveAxis,
      onSelectLayer: setSelectedLayerId,
      onToggleLayerVisibility: toggleSelectedLayerVisibility,
      onLayerScaleChange: updateSelectedLayerScale,
      onLayerDepthChange: updateSelectedLayerDepth,
      lightingRef: inspectorRefs.lighting,
      lightingTrack,
      activeKeyLightIntensity,
      keyLightIntensity,
      activeKeyLightPosition,
      keyLightColor,
      keyLightSoftness,
      lightPositionIsKeyed: Boolean(lightPositionKeyframeAtPlayhead()),
      lightPositionKeyframeControl: renderLightPositionKeyframeControl(),
      onLightPositionChange: updateLightPositionXY,
      onLightColorChange: setKeyLightColor,
      onLightSoftnessChange: setKeyLightSoftness,
      onToggleLightPositionKeyframe: toggleLightPositionKeyframeAtPlayhead,
      onBrightnessChange: handleBrightnessChange,
    })

  const exportScene = useExportSceneSnapshot({
    materialPreset,
    colorA,
    colorB: renderColorB,
    roughness,
    metalness,
    reflectance,
    clearcoat,
    clearcoatRoughness,
    transmission,
    thickness,
    emissiveIntensity,
    extrusionDepth: activeExtrusionDepth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
    layerSpacing,
    ambientIntensity,
    keyLightIntensity: activeKeyLightIntensity,
    rimLightIntensity,
    svgPathA: iconAContent,
    svgPathB: iconBContent,
  })

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased select-none">
      <AppTopBar
        zenMode={zenMode}
        themeMounted={themeMounted}
        isLightTheme={isLightTheme}
        themeToggleLabel={themeToggleLabel}
        onZenModeChange={setZenMode}
        onThemeChange={setTheme}
        onExportOpen={openExport}
      />

      <div className="flex min-h-0 flex-1 bg-muted/40">
        <ViewportStage
          ref={canvas3DRef}
          zenMode={zenMode}
          isDragging={isDragging}
          onDragStateChange={setIsDragging}
          onDropSvg={handleDropSvg}
          canvasProps={canvasProps}
          viewOptionsProps={viewOptionsProps}
          playbackProps={playbackProps}
        />

        <InspectorSidebar
          zenMode={zenMode}
          styleProps={styleProps}
          geometryProps={geometryProps}
          transformProps={transformProps}
          lightProps={lightProps}
        />
      </div>

      <TimelineDock zenMode={zenMode} timelineProps={timelineProps} />

      <input
        ref={uploadFileRef}
        type="file"
        accept=".svg"
        className="hidden"
        onChange={handleUploadInputChange}
      />

      {/* =========================================================================
          4. EXPORT STUDIO MODAL
          ========================================================================= */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={closeExport}
        onExportGltf={() => canvas3DRef.current?.exportGltf()}
        onExportVideo={exportTimelineVideo}
        scene={exportScene}
      />
    </div>
  )
}
