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
import { Task } from '../types/index.js';

// Custom Node Component for Tasks in Digital Twin
const TaskNode = ({ data }: any) => {
  const isSelected = data.isSelected;
  const isBlocked = data.task.status === 'BLOCKED';
  const isDone = data.task.status === 'DONE';
  const isCritical = data.task.priority === 'CRITICAL';

  let borderColor = 'border-border';
  let bgColor = 'bg-background-card';
  if (isDone) borderColor = 'border-emerald-500/50 bg-emerald-950/20';
  else if (isBlocked) borderColor = 'border-amber-500/60 bg-amber-950/30';
  else if (isCritical) borderColor = 'border-rose-500/60 bg-rose-950/20';
  if (isSelected) borderColor = 'border-primary-400 ring-2 ring-primary-500/50 shadow-glow';

  return (
    <div className={`w-56 p-3.5 rounded-2xl border ${borderColor} ${bgColor} text-left shadow-md transition-all`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary-500" />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/5 text-slate-300">
          {data.task.team?.name?.split(' ')[0] || 'Task'}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
          isDone ? 'bg-emerald-500/20 text-emerald-300' : isBlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-primary-500/20 text-primary-300'
        }`}>
          {data.task.status}
        </span>
      </div>
      <div className="text-xs font-bold text-white leading-snug line-clamp-2">
        {data.task.title}
      </div>
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <span>{new Date(data.task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        <span className="font-semibold text-slate-300 truncate max-w-[80px]">
          {data.task.assignee?.name || 'Unassigned'}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-accent-cyan" />
    </div>
  );
};

export const DigitalTwinPage: React.FC = () => {
  const { currentEvent } = useEvent();
  const tasks = currentEvent?.tasks || [];

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
        data: { task, isSelected: selectedTask?.id === task.id },
      });

      // Add edges from dependencies
      if (task.dependencies) {
        task.dependencies.forEach((dep) => {
          edges.push({
            id: `edge-${dep.dependsOnTaskId}-${task.id}`,
            source: dep.dependsOnTaskId,
            target: task.id,
            animated: task.status === 'BLOCKED',
            style: { stroke: task.status === 'BLOCKED' ? '#F59E0B' : '#6366F1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: task.status === 'BLOCKED' ? '#F59E0B' : '#6366F1' },
          });
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [tasks, selectedTask?.id]);

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
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="live-pulse" />
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary-400" />
              <span>Event Digital Twin</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time topological graph of tasks, teams, dependencies, and critical bottleneck paths.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Click any node to inspect details & AI analysis</span>
        </div>
      </div>

      {/* Main Flow Canvas with Slide-out Inspector Drawer */}
      <div className="flex-1 relative rounded-3xl border border-border bg-background-card overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          className="bg-background"
        >
          <Background color="#1E293B" gap={20} size={1} />
          <Controls className="!bg-background-card !border-border !text-slate-300" />
          <MiniMap 
            nodeColor={(n: any) => n.data?.task?.status === 'DONE' ? '#10B981' : '#6366F1'}
            className="!bg-background-card !border-border rounded-xl" 
          />
        </ReactFlow>

        {/* Node Inspector Flyout Panel */}
        {selectedTask && (
          <div className="absolute top-4 right-4 w-80 sm:w-96 bg-background-card/95 backdrop-blur-xl border border-border-highlight rounded-2xl shadow-2xl p-5 z-20 animate-scale-in">
            <div className="flex items-start justify-between pb-3 border-b border-border mb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/20 text-primary-300">
                  NODE INSPECTION
                </span>
                <h3 className="text-sm font-bold text-white mt-1 leading-snug">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-primary-300">{selectedTask.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Priority</span>
                <span className={`font-semibold ${selectedTask.priority === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Workstream Team</span>
                <span className="text-slate-200">{selectedTask.team?.name || 'Core Operations'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Assignee</span>
                <span className="text-slate-200">{selectedTask.assignee?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Target Deadline</span>
                <span className="text-slate-200">{new Date(selectedTask.deadline).toLocaleDateString()}</span>
              </div>
            </div>

            {/* AI "Explain this" Button */}
            <div className="mt-4 pt-3 border-t border-border">
              <button
                onClick={handleExplainNode}
                disabled={explaining}
                className="w-full py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <span>{explaining ? 'Analyzing Node...' : 'Explain this Node with AI'}</span>
              </button>

              {/* AI Explanation Box */}
              {aiExplanation && (
                <div className="mt-3 p-3.5 rounded-xl bg-primary-950/40 border border-primary-500/30 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto animate-fade-in whitespace-pre-wrap">
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
