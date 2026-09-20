import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Network, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Layers, 
  X, 
  Bot,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { Task } from '../types/index.js';

// Custom Node Component for Tasks in Digital Twin
const TaskNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const isBlocked  = data.task.status === 'BLOCKED';
  const isDone     = data.task.status === 'DONE';
  const isInProg   = data.task.status === 'IN_PROGRESS';
  const isCritical = data.task.priority === 'CRITICAL';
  const isHigh     = data.task.priority === 'HIGH';
  const isDark     = data.isDark !== false; // default dark

  const cardBase   = isDark ? '#0E1120' : '#FFFFFF';
  const borderBase = isDark ? '#1E2640' : '#D1D9E6';
  const titleColor = isDark ? '#E8EAF0' : '#0F172A';
  const dateColor  = isDark ? '#4A5578' : '#64748B';
  const assigneeColor = isDark ? '#8892B0' : '#475569';
  const dividerColor  = isDark ? '#1E2640' : '#E2E8F0';
  const handleBorder  = isDark ? '#0A0D1A' : '#FFFFFF';

  // Card background
  const cardBg = isDone     ? `linear-gradient(135deg,rgba(16,185,129,0.08) 0%,${cardBase} 100%)`
               : isBlocked  ? `linear-gradient(135deg,rgba(245,158,11,0.1) 0%,${cardBase} 100%)`
               : isCritical ? `linear-gradient(135deg,rgba(244,63,94,0.08) 0%,${cardBase} 100%)`
               : cardBase;

  const cardBorder = isSelected ? '2px solid #6366F1'
                   : isDone     ? '1.5px solid rgba(16,185,129,0.5)'
                   : isBlocked  ? '1.5px solid rgba(245,158,11,0.6)'
                   : isCritical ? '1.5px solid rgba(244,63,94,0.5)'
                   : `1px solid ${borderBase}`;

  const cardShadow = isSelected
    ? '0 0 0 3px rgba(99,102,241,0.2), 0 8px 24px rgba(0,0,0,0.5)'
    : isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(15,23,42,0.08)';

  // Status badge
  const statusConfig: Record<string, { bg: string; color: string }> = {
    TODO:        { bg: 'rgba(99,102,241,0.15)',  color: '#818CF8' },
    IN_PROGRESS: { bg: 'rgba(6,182,212,0.15)',   color: '#67E8F9' },
    BLOCKED:     { bg: 'rgba(245,158,11,0.15)',  color: '#FBBF24' },
    DONE:        { bg: 'rgba(16,185,129,0.15)',  color: '#6EE7B7' },
    IN_REVIEW:   { bg: 'rgba(139,92,246,0.15)',  color: '#C4B5FD' },
  };
  const sc = statusConfig[data.task.status] || statusConfig.TODO;

  // Team color accent
  const teamColors = ['#818CF8','#67E8F9','#6EE7B7','#FBBF24','#F87171','#C4B5FD','#FB923C'];
  const teamHash = (data.task.team?.name || 'X').charCodeAt(0) % teamColors.length;
  const teamColor = teamColors[teamHash];

  return (
    <div style={{
      width: 230,
      padding: '14px 16px',
      borderRadius: 18,
      border: cardBorder,
      background: cardBg,
      boxShadow: cardShadow,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'Inter, sans-serif',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ width: 7, height: 7, background: '#6366F1', border: `2px solid ${handleBorder}`, top: -4 }} />

      {/* Top: Team label + Status badge */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
          color: teamColor, fontFamily: 'Inter',
          maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.task.team?.name || 'General'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono',
          padding: '2px 7px', borderRadius: 20,
          background: sc.bg, color: sc.color,
          letterSpacing: '0.06em', border: `1px solid ${sc.color}30`,
        }}>
          {data.task.status === 'IN_PROGRESS' ? 'IN_PROG' : data.task.status}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
        color: titleColor, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        letterSpacing: '-0.01em', marginBottom: 12,
      }}>
        {data.task.title}
      </div>

      {/* Bottom: Date + Assignee */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: `1px solid ${dividerColor}`,
        fontSize: 10, fontFamily: 'Inter',
      }}>
        <span style={{ color: dateColor, fontWeight: 500 }}>
          {new Date(data.task.deadline).toLocaleDateString([], { day: 'numeric', month: 'short' })}
        </span>
        <span style={{
          color: assigneeColor, fontWeight: 600,
          maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {data.task.assignee?.name || 'Unassigned'}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ width: 7, height: 7, background: '#06B6D4', border: `2px solid ${handleBorder}`, bottom: -4 }} />
    </div>
  );
};

export const DigitalTwinPage: React.FC = () => {
  const { currentEvent } = useEvent();
  const { isDark } = useTheme();
  const tasks = currentEvent?.tasks || [];

  // Theme-aware canvas colors
  const canvasBg      = isDark ? '#07090F' : '#F4F6F9';
  const canvasBorder  = isDark ? '#1E2640' : '#D1D9E6';
  const dotColor      = isDark ? '#1E2640' : '#A3B0C8';
  const minimapBg     = isDark ? '#0E1120' : '#FFFFFF';
  const minimapMask   = isDark ? 'rgba(7,9,15,0.8)' : 'rgba(244,246,249,0.8)';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Generate React Flow Nodes and Edges from tasks and dependencies
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Group tasks into rows/columns
    tasks.slice(0, 15).forEach((task, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);

      nodes.push({
        id: task.id,
        type: 'taskNode',
        position: { x: col * 260 + 50, y: row * 160 + 50 },
        data: { task, isSelected: selectedTask?.id === task.id, isDark },
      });

      // Add edges from dependencies
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          edges.push({
            id: `edge-${dep.dependsOnTaskId}-${task.id}`,
            source: dep.dependsOnTaskId,
            target: task.id,
            animated: task.status === 'BLOCKED',
            style: {
              stroke: task.status === 'BLOCKED' ? '#FBBF24' : '#6366F1',
              strokeWidth: 2,
              opacity: 0.85,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: task.status === 'BLOCKED' ? '#FBBF24' : '#6366F1',
              width: 16,
              height: 16,
            },
          });
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [tasks, selectedTask?.id, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ taskNode: TaskNode }), []);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedTask(node.data.task);
    setAiExplanation(null);
  }, []);

  const handleExplainNode = () => {
    if (!selectedTask) return;
    setExplaining(true);
    setTimeout(() => {
      setExplaining(false);
      setAiExplanation(
        `**AI Digital Twin Analysis for "${selectedTask.title}":**\n\n` +
        `- **Critical Path Importance**: This task is situated in the **${selectedTask.team?.name || 'Operations'}** workstream. Downstream deliverables depend on its completion by **${new Date(selectedTask.deadline).toLocaleDateString()}**.\n` +
        `- **Risk Evaluation**: Assigned priority is **${selectedTask.priority}**. ${
          selectedTask.status === 'BLOCKED'
            ? 'Currently **BLOCKED** by an upstream prerequisite. Resolving this will free up 2 downstream milestone tasks.'
            : 'Currently proceeding according to the planned sprint schedule.'
        }\n` +
        `- **Recommended Action**: ${
          !selectedTask.assigneeId
            ? 'Assign a volunteer using Smart Volunteer Matching to prevent deadline slips.'
            : 'Maintain current checkpoint tracking.'
        }`
      );
    }, 600);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3"
        style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-heading font-black flex items-center space-x-2"
              style={{ color: 'var(--text-primary)' }}>
              <Network className="w-5 h-5 text-primary-500" />
              <span>Event <span className="text-gradient">Digital Twin</span></span>
            </h1>
          </div>
          <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Real-time topological graph of tasks, teams, dependencies, and critical bottleneck paths.
          </p>
        </div>
        <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
          Click any node to inspect details &amp; AI analysis
        </span>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 relative rounded-2xl overflow-hidden digital-twin-canvas"
        style={{
          border: `1px solid ${canvasBorder}`,
          background: canvasBg,
          boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.6)' : '0 4px 24px rgba(15,23,42,0.08)',
        }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          style={{ background: canvasBg }}
        >
          <Background color={dotColor} gap={28} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n: any) => {
              if (n.data?.task?.status === 'DONE')       return '#10B981';
              if (n.data?.task?.status === 'BLOCKED')    return '#F59E0B';
              if (n.data?.task?.priority === 'CRITICAL') return '#F43F5E';
              return '#6366F1';
            }}
            maskColor={minimapMask}
            style={{ background: minimapBg, border: `1px solid ${canvasBorder}`, borderRadius: 10 }}
          />
        </ReactFlow>

        {/* Node Inspector Panel */}
        {selectedTask && (
          <div className="absolute top-4 right-4 w-80 sm:w-96 z-20 animate-scale-in rounded-2xl p-5"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-hi)',
              boxShadow: '0 8px 40px rgba(99,102,241,0.18)',
            }}>
            <div className="flex items-start justify-between pb-3 mb-4"
              style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div>
                <span className="badge badge-primary">NODE INSPECTION</span>
                <h3 className="text-sm font-heading font-bold mt-1.5 leading-snug"
                  style={{ color: 'var(--text-primary)' }}>
                  {selectedTask.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-body">
              {[
                { label: 'Status',    value: selectedTask.status,             valueColor: '#6366F1' },
                { label: 'Priority',  value: selectedTask.priority,           valueColor: selectedTask.priority === 'CRITICAL' ? '#F43F5E' : '#F59E0B' },
                { label: 'Team',      value: selectedTask.team?.name || 'Core Operations', valueColor: 'var(--text-secondary)' },
                { label: 'Assignee',  value: selectedTask.assignee?.name || 'Unassigned',  valueColor: 'var(--text-secondary)' },
                { label: 'Deadline',  value: new Date(selectedTask.deadline).toLocaleDateString(), valueColor: 'var(--text-secondary)' },
              ].map(({ label, value, valueColor }) => (
                <div key={label} className="flex justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold font-mono" style={{ color: valueColor }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
              <button onClick={handleExplainNode} disabled={explaining}
                className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs font-heading transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}>
                <Sparkles className="w-4 h-4" style={{ color: '#67E8F9' }} />
                <span>{explaining ? 'Analyzing Node...' : 'Explain this Node with AI'}</span>
              </button>

              {aiExplanation && (
                <div className="mt-3 p-3.5 rounded-xl text-xs font-body leading-relaxed max-h-48 overflow-y-auto animate-fade-in whitespace-pre-wrap"
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: 'var(--text-secondary)',
                  }}>
                  {aiExplanation}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
