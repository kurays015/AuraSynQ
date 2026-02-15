"use client"

import React, { useEffect, useRef, useState } from 'react'
import { fabric } from 'fabric'

interface PaintCanvasProps {
    brushColor: string
    brushSize: number
    isDrawing: boolean
    brushType: 'pencil' | 'circle' | 'spray' | 'eraser'
    canvasRefCallback?: (canvas: fabric.Canvas) => void
}

export default function PaintCanvas({ brushColor, brushSize, isDrawing, brushType, canvasRefCallback }: PaintCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null)

    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#f5f5f5',
            isDrawingMode: true,
            preserveObjectStacking: true, // Prevent selected objects from jumping to front
        })

        setFabricCanvas(canvas)
        if (canvasRefCallback) {
            canvasRefCallback(canvas)
        }

        const handleResize = () => {
            canvas.setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = canvas.getActiveObjects();
                if (activeObjects.length) {
                    canvas.discardActiveObject();
                    activeObjects.forEach((obj) => {
                        // Don't delete locked objects via keyboard
                        if (!obj.lockMovementX) {
                            canvas.remove(obj);
                        }
                    });
                }
            }
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            canvas.dispose()
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    useEffect(() => {
        if (!fabricCanvas) return

        fabricCanvas.isDrawingMode = isDrawing

        // LOCKED OBJECTS LOGIC
        // 1. Enforce Layering: Locked objects must always be on top to prevent being "overlapped" or "erased" by new strokes.
        const enforceLockedLayering = () => {
            fabricCanvas.getObjects().forEach((obj) => {
                if (obj.lockMovementX) {
                    obj.bringToFront()
                }
            })
        }

        // 2. Enforce Events: Locked objects should bypass events when drawing (so we can draw "under" them without selecting),
        // but capture events when not drawing (so we can select them to unlock).
        fabricCanvas.getObjects().forEach((obj) => {
            if (obj.lockMovementX) {
                obj.evented = !isDrawing
            }
        })

        // Initial enforcement
        enforceLockedLayering()
        fabricCanvas.requestRenderAll()

        // Listeners to keep enforcing
        fabricCanvas.on('path:created', enforceLockedLayering)
        // Also enforce when an object is modified (e.g. just locked)
        fabricCanvas.on('object:modified', enforceLockedLayering)

        if (isDrawing) {
            // Set up the brush
            let brush;
            switch (brushType) {
                case 'circle':
                    // @ts-ignore - Fabric.js v5 types mismatch
                    brush = new fabric.CircleBrush(fabricCanvas);
                    brush.color = brushColor
                    break;
                case 'spray':
                    // @ts-ignore - Fabric.js v5 types mismatch
                    brush = new fabric.SprayBrush(fabricCanvas);
                    brush.color = brushColor
                    break;
                case 'eraser':
                    brush = new fabric.PencilBrush(fabricCanvas);
                    brush.color = '#f5f5f5'; // Match background color
                    break;
                case 'pencil':
                default:
                    brush = new fabric.PencilBrush(fabricCanvas);
                    brush.color = brushColor
                    break;
            }

            brush.width = brushSize
            fabricCanvas.freeDrawingBrush = brush
        }

        return () => {
            fabricCanvas.off('path:created', enforceLockedLayering)
            fabricCanvas.off('object:modified', enforceLockedLayering)
        }

    }, [fabricCanvas, brushColor, brushSize, isDrawing, brushType])

    // Effect to handle color changes on selected objects (Fill behavior)
    useEffect(() => {
        if (!fabricCanvas || isDrawing) return

        const updateSelectionColor = () => {
            const activeObject = fabricCanvas.getActiveObject()
            if (!activeObject) return

            if (activeObject instanceof fabric.Path) {
                activeObject.set('stroke', brushColor)
            } else {
                activeObject.set('fill', brushColor)
                if (activeObject instanceof fabric.Group) {
                    activeObject.getObjects().forEach(obj => {
                        if (obj instanceof fabric.Path) {
                            obj.set('stroke', brushColor)
                        } else {
                            obj.set('fill', brushColor)
                        }
                    })
                }
            }
            fabricCanvas.requestRenderAll()
        }

        updateSelectionColor()

    }, [brushColor, fabricCanvas, isDrawing])

    return (
        <div className="w-full h-screen overflow-hidden bg-gray-100">
            <canvas ref={canvasRef} />
        </div>
    )
}
