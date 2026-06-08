"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/appContext";
import { MemoryEntry } from "@/lib/memoryStore";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  type: "topic" | "source" | "memory";
  color: string;
  memory?: MemoryEntry;
  x?: number;
  y?: number;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const SOURCE_COLORS: Record<string, string> = {
  Meeting: "#1a1a1a",
  Web: "#2563eb",
  File: "#16a34a",
  Notes: "#d97706",
  System: "#7c3aed",
};

const TOPIC_COLORS: Record<string, string> = {
  "Vector Database": "#0ea5e9",
  "Privacy Architecture": "#8b5cf6",
  "Local LLM Setup": "#10b981",
  "RAG Performance": "#f59e0b",
  "System Testing": "#ef4444",
  "Context Capture": "#6366f1",
  "Secure Sharing": "#ec4899",
};

export function MemoryGraphPage() {
  const { memories } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [tooltip, setTooltip] = useState<{
    screenX: number;
    screenY: number;
    node: NodeData;
  } | null>(null);

  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<NodeData[]>([]);
  const velocitiesRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const hoveredNodeRef = useRef<NodeData | null>(null);
  const selectedNodeRef = useRef<NodeData | null>(null);

  // Transform state: scale + pan
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const [transformState, setTransformState] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });

  // Pan drag state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ tx: 0, ty: 0 });

  // Convert screen coords to canvas world coords
  const toWorld = (sx: number, sy: number): { x: number; y: number } => {
    const t = transformRef.current;
    return {
      x: (sx - t.tx) / t.scale,
      y: (sy - t.ty) / t.scale,
    };
  };

  const applyTransform = (newT: Transform) => {
    // Clamp scale
    newT.scale = Math.max(0.3, Math.min(4, newT.scale));
    transformRef.current = newT;
    setTransformState({ ...newT });
  };

  // Build graph data
  useEffect(() => {
    const topicMap = new Map<string, NodeData>();
    const sourceMap = new Map<string, NodeData>();
    const memoryNodes: NodeData[] = [];
    const newEdges: EdgeData[] = [];

    memories.forEach((m) => {
      if (!topicMap.has(m.topic)) {
        topicMap.set(m.topic, {
          id: `topic-${m.topic}`,
          label: m.topic,
          type: "topic",
          color: TOPIC_COLORS[m.topic] || "#555",
        });
      }
      if (!sourceMap.has(m.source)) {
        sourceMap.set(m.source, {
          id: `source-${m.source}`,
          label: m.source,
          type: "source",
          color: SOURCE_COLORS[m.source] || "#888",
        });
      }
      memoryNodes.push({
        id: m.id,
        label: m.summary.slice(0, 30) + "...",
        type: "memory",
        color: TOPIC_COLORS[m.topic] || "#aaa",
        memory: m,
      });
      newEdges.push({ id: `e-mem-topic-${m.id}`, source: m.id, target: `topic-${m.topic}` });
      newEdges.push({ id: `e-mem-source-${m.id}`, source: m.id, target: `source-${m.source}` });
    });

    const allNodes = [
      ...Array.from(topicMap.values()),
      ...Array.from(sourceMap.values()),
      ...memoryNodes,
    ];

    const cx = 400;
    const cy = 300;
    const radius = 180;
    allNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / allNodes.length;
      const r =
        node.type === "topic" ? radius * 0.5 : node.type === "source" ? radius * 0.35 : radius;
      node.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 40;
      node.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 40;
      velocitiesRef.current.set(node.id, { vx: 0, vy: 0 });
    });

    setNodes(allNodes);
    setEdges(newEdges);
    nodesRef.current = allNodes;
  }, [memories]);

  const draw = useCallback(
    (ns: NodeData[], es: EdgeData[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const t = transformRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply transform
      ctx.save();
      ctx.translate(t.tx, t.ty);
      ctx.scale(t.scale, t.scale);

      // Grid background
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 1 / t.scale;
      const gridSize = 50;
      const startX = Math.floor(-t.tx / t.scale / gridSize) * gridSize - gridSize;
      const startY = Math.floor(-t.ty / t.scale / gridSize) * gridSize - gridSize;
      const endX = startX + canvas.width / t.scale + gridSize * 2;
      const endY = startY + canvas.height / t.scale + gridSize * 2;
      for (let gx = startX; gx < endX; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, startY);
        ctx.lineTo(gx, endY);
        ctx.stroke();
      }
      for (let gy = startY; gy < endY; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, gy);
        ctx.lineTo(endX, gy);
        ctx.stroke();
      }

      // Draw edges
      es.forEach((e) => {
        const src = ns.find((n) => n.id === e.source);
        const tgt = ns.find((n) => n.id === e.target);
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x || 0, src.y || 0);
        ctx.lineTo(tgt.x || 0, tgt.y || 0);
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1.5 / t.scale;
        ctx.stroke();
      });

      // Draw nodes
      ns.forEach((node) => {
        const x = node.x || 0;
        const y = node.y || 0;
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const isSelected = selectedNodeRef.current?.id === node.id;
        const baseR = node.type === "topic" ? 18 : node.type === "source" ? 14 : 9;
        const r = baseR + (isHovered || isSelected ? 3 : 0);

        // Glow for hovered/selected
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = node.color + "22";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? node.color : isHovered ? node.color + "dd" : node.color + "99";
        ctx.fill();
        ctx.strokeStyle = isSelected || isHovered ? node.color : "#fff";
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) / t.scale;
        ctx.stroke();

        // Label
        if (node.type !== "memory" || isHovered) {
          ctx.fillStyle = isHovered ? "#111" : "#555";
          ctx.font = `${(node.type === "topic" ? 11 : 10) / t.scale}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            node.type === "memory" ? node.memory?.topic || "" : node.label,
            x,
            y + r + 14 / t.scale
          );
        }
      });

      ctx.restore();
    },
    []
  );

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      const ns = [...nodesRef.current];
      const edgeMap = edges.reduce((acc, e) => {
        acc[e.source] = acc[e.source] || [];
        acc[e.target] = acc[e.target] || [];
        acc[e.source].push(e.target);
        acc[e.target].push(e.source);
        return acc;
      }, {} as Record<string, string[]>);

      const alpha = 0.03;
      for (let i = 0; i < ns.length; i++) {
        const a = ns[i];
        const va = velocitiesRef.current.get(a.id) || { vx: 0, vy: 0 };

        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const b = ns[j];
          const dx = (a.x || 0) - (b.x || 0);
          const dy = (a.y || 0) - (b.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulsion = 2000 / (dist * dist);
          va.vx += (dx / dist) * repulsion * alpha;
          va.vy += (dy / dist) * repulsion * alpha;
        }

        const neighbors = edgeMap[a.id] || [];
        for (const nid of neighbors) {
          const b = ns.find((n) => n.id === nid);
          if (!b) continue;
          const dx = (b.x || 0) - (a.x || 0);
          const dy = (b.y || 0) - (a.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.01;
          va.vx += (dx / dist) * force;
          va.vy += (dy / dist) * force;
        }

        va.vx += ((400 - (a.x || 0)) / 1000) * 5;
        va.vy += ((300 - (a.y || 0)) / 1000) * 5;
        va.vx *= 0.85;
        va.vy *= 0.85;
        velocitiesRef.current.set(a.id, va);
        a.x = Math.max(40, Math.min(760, (a.x || 0) + va.vx));
        a.y = Math.max(40, Math.min(560, (a.y || 0) + va.vy));
      }
      nodesRef.current = ns;
      draw(ns, edges);
      animFrameRef.current = requestAnimationFrame(simulate);
    };

    animFrameRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [nodes, edges, draw]);

  const getNodeAt = (worldX: number, worldY: number): NodeData | null => {
    // Iterate in reverse so top-drawn nodes are hit first
    const ns = [...nodesRef.current].reverse();
    for (const node of ns) {
      const nx = node.x || 0;
      const ny = node.y || 0;
      const r = (node.type === "topic" ? 18 : node.type === "source" ? 14 : 9) + 4;
      if (Math.hypot(worldX - nx, worldY - ny) <= r) return node;
    }
    return null;
  };

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const t = transformRef.current;
    const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(0.3, Math.min(4, t.scale * zoomFactor));
    // Zoom toward mouse position
    const newTx = mx - (mx - t.tx) * (newScale / t.scale);
    const newTy = my - (my - t.ty) * (newScale / t.scale);
    applyTransform({ scale: newScale, tx: newTx, ty: newTy });
  };

  // Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy);
    const node = getNodeAt(world.x, world.y);
    if (!node) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { tx: transformRef.current.tx, ty: transformRef.current.ty };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Pan
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      applyTransform({
        scale: transformRef.current.scale,
        tx: panOriginRef.current.tx + dx,
        ty: panOriginRef.current.ty + dy,
      });
      return;
    }

    // Hover
    const world = toWorld(sx, sy);
    const node = getNodeAt(world.x, world.y);
    hoveredNodeRef.current = node;

    if (node) {
      setTooltip({ screenX: sx, screenY: sy, node });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy);
    const node = getNodeAt(world.x, world.y);
    const next = node?.type === "memory" ? node : null;
    selectedNodeRef.current = next;
    setSelectedNode(next);
  };

  const handleMouseLeave = () => {
    isPanningRef.current = false;
    hoveredNodeRef.current = null;
    setTooltip(null);
  };

  const zoomIn = () => {
    const t = transformRef.current;
    const cx = (canvasRef.current?.width || 800) / 2;
    const cy = (canvasRef.current?.height || 600) / 2;
    const ns = Math.min(4, t.scale * 1.3);
    applyTransform({ scale: ns, tx: cx - (cx - t.tx) * (ns / t.scale), ty: cy - (cy - t.ty) * (ns / t.scale) });
  };

  const zoomOut = () => {
    const t = transformRef.current;
    const cx = (canvasRef.current?.width || 800) / 2;
    const cy = (canvasRef.current?.height || 600) / 2;
    const ns = Math.max(0.3, t.scale / 1.3);
    applyTransform({ scale: ns, tx: cx - (cx - t.tx) * (ns / t.scale), ty: cy - (cy - t.ty) * (ns / t.scale) });
  };

  const resetView = () => {
    applyTransform({ scale: 1, tx: 0, ty: 0 });
  };

  return (
    <div className="flex h-full">
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative bg-[#fafafa] overflow-hidden">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10">
          <h2 className="text-sm font-semibold text-black">Memory Graph</h2>
          <p className="text-xs text-[#999] mt-0.5">
            {memories.length} memory nodes · Scroll to zoom · Drag to pan
          </p>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
          <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={zoomIn}
              title="Zoom in"
              className="flex items-center justify-center w-8 h-8 hover:bg-[#f5f5f5] transition-colors border-b border-[#f0f0f0]"
            >
              <ZoomIn size={14} className="text-[#555]" />
            </button>
            <button
              onClick={zoomOut}
              title="Zoom out"
              className="flex items-center justify-center w-8 h-8 hover:bg-[#f5f5f5] transition-colors border-b border-[#f0f0f0]"
            >
              <ZoomOut size={14} className="text-[#555]" />
            </button>
            <button
              onClick={resetView}
              title="Reset view"
              className="flex items-center justify-center w-8 h-8 hover:bg-[#f5f5f5] transition-colors"
            >
              <Maximize2 size={13} className="text-[#555]" />
            </button>
          </div>
          {/* Zoom level badge */}
          <div className="bg-white border border-[#e5e5e5] rounded-lg px-2 py-1 text-center shadow-sm">
            <span className="text-[11px] text-[#888] font-medium tabular-nums">
              {Math.round(transformState.scale * 100)}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white border border-[#e5e5e5] rounded-lg px-3 py-2 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1.5">Legend</p>
          {[
            { label: "Topic", size: 18, color: "#555" },
            { label: "Source", size: 14, color: "#888" },
            { label: "Memory", size: 9, color: "#aaa" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2 mb-1">
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: l.size,
                  height: l.size,
                  backgroundColor: l.color + "88",
                  border: `1.5px solid ${l.color}`,
                }}
              />
              <span className="text-xs text-[#666]">{l.label}</span>
            </div>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block", cursor: isPanningRef.current ? "grabbing" : "grab" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              key={tooltip.node.id}
              initial={{ opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.12 }}
              className="absolute pointer-events-none z-20"
              style={{
                left: tooltip.screenX + 16,
                top: tooltip.screenY - 10,
                maxWidth: 240,
              }}
            >
              <div className="bg-white border border-[#e0e0e0] rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
                {/* Node type badge */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{
                      width: tooltip.node.type === "topic" ? 10 : tooltip.node.type === "source" ? 8 : 6,
                      height: tooltip.node.type === "topic" ? 10 : tooltip.node.type === "source" ? 8 : 6,
                      backgroundColor: tooltip.node.color,
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: tooltip.node.color }}
                  >
                    {tooltip.node.type}
                  </span>
                </div>

                {/* Label */}
                <p className="font-semibold text-black leading-snug mb-1">
                  {tooltip.node.type === "memory"
                    ? tooltip.node.memory?.summary?.slice(0, 60) + (tooltip.node.memory!.summary.length > 60 ? "…" : "")
                    : tooltip.node.label}
                </p>

                {/* Memory details */}
                {tooltip.node.memory && (
                  <>
                    <div className="flex items-center gap-2 mt-1 mb-1">
                      <span className="bg-[#f5f5f5] text-[#666] px-1.5 py-0.5 rounded text-[10px]">
                        {tooltip.node.memory.source}
                      </span>
                      <span className="text-[#aaa] text-[10px]">
                        {new Date(tooltip.node.memory.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[#666] leading-relaxed mt-1">
                      {tooltip.node.memory.content.slice(0, 100)}
                      {tooltip.node.memory.content.length > 100 ? "…" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tooltip.node.memory.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[9px] bg-[#f5f5f5] text-[#888] px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Source node details */}
                {tooltip.node.type === "source" && (
                  <p className="text-[#888] mt-1">
                    {memories.filter((m) => m.source === tooltip.node.label).length} memories from this source
                  </p>
                )}

                {/* Topic node details */}
                {tooltip.node.type === "topic" && (
                  <p className="text-[#888] mt-1">
                    {memories.filter((m) => m.topic === tooltip.node.label).length} memories in this topic
                  </p>
                )}

                {tooltip.node.type === "memory" && (
                  <p className="text-[#bbb] text-[10px] mt-2 italic">Click to open full detail</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedNode && selectedNode.memory && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[280px] bg-white border-l border-[#e5e5e5] flex flex-col overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
              <p className="text-sm font-semibold text-black">Memory Detail</p>
              <button
                onClick={() => {
                  selectedNodeRef.current = null;
                  setSelectedNode(null);
                }}
                className="text-[#aaa] hover:text-black"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div
                className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3"
                style={{
                  backgroundColor: selectedNode.color + "22",
                  color: selectedNode.color,
                }}
              >
                {selectedNode.memory.topic}
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="text-xs bg-[#f5f5f5] text-[#666] px-2 py-0.5 rounded">
                  {selectedNode.memory.source}
                </span>
                <span className="text-xs text-[#999]">
                  {new Date(selectedNode.memory.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs font-medium text-black mb-2">{selectedNode.memory.summary}</p>
              <p className="text-xs text-[#666] leading-relaxed">{selectedNode.memory.content}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedNode.memory.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-[#f5f5f5] text-[#777] px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
