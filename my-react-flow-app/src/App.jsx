import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
} from 'reactflow';

import 'reactflow/dist/style.css';

import ContextMenu from './ContextMenu.jsx';
import Sidebar from './Sidebar.jsx';

import './index.css';

let id = 0;
const getId = () => `dndnode_${id++}`;

const App = () => {

  const reactFlowWrapper = useRef(null);
  const [menu, setMenu] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const ref = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      const { nodes: importedNodes, edges: importedEdges } = data;
      setEdges(importedEdges);
      setNodes(importedNodes);
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const graphData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        size: node.size,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated,
        data: edge.data,
      })),
    };
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      // Prevent native context menu from showing
      event.preventDefault();

      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = ref.current.getBoundingClientRect();
      setMenu({
        id: node.id,
        size: node.size,
        top: event.clientY < pane.height - 200 && event.clientY,
        left: event.clientX < pane.width - 200 && event.clientX,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
        bottom:
          event.clientY >= pane.height - 200 && pane.height - event.clientY,
      });
    },
    [setMenu],
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }


      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
        size: 1
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance],

  );
  useEffect(() => {
    console.log(nodes)
  }, [nodes]);

  const onPaneClick = useCallback((event) => {
    // Exclude clicks on the slider from closing the context menu
    if (event.target.tagName.toLowerCase() !== 'input') {
      setMenu(null);
    }
  }, [setMenu]);
  

  return (
    <div className="dndflow">
      <ReactFlowProvider>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}  style={{ width: '100vw', height: '100vh' }}>
          <ReactFlow
            ref={ref}
            nodes={nodes}
            edges={edges}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
          <p>{nodes.length}</p>
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />  
          {menu && <ContextMenu onClick={onPaneClick} {...menu} />}        
        </ReactFlow>
        </div>
        
        <Sidebar />
        <button onClick={handleDownload}>Download Graph</button>
        <input type="file" accept=".json" onChange={handleFileChange} />
      </ReactFlowProvider>
    </div>
  );
};

export default App;
