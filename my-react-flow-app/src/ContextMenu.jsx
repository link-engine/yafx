import React, { useCallback, useState } from 'react';
import { useReactFlow } from 'reactflow';

import ThreeScene from './ThreeScene.jsx';
// ContextMenu component
export default function ContextMenu({
  id,
  size,
  top,
  left,
  right,
  bottom,
  ...props
}) {
  const {setNodes} = useReactFlow();
  const [sliderValue, setSliderValue] = useState(size); // Initial slider value


  const handleSliderChange = (event) => {
    setSliderValue(event.target.value);
    updateNodeSize(event.target.value);
  };

  const updateNodeSize = useCallback((val) => {
    setNodes((nodes) =>
      nodes.map((n) => ({...n, size: val }))
    );

    setSliderValue(event.target.value);

  }, [id, setNodes, size]);

  return (
    <div
      style={{ top, left, right, bottom, display: 'flex', alignItems: 'center' }}
      className="context-menu"
      {...props}
    >
      <div style={{ flex: '1' }}>
        <p style={{ margin: '0.5em' }}>
          <small>node: {id}</small>
        </p>
        <input
          type="range"
          min="1"
          max="10"
          value={sliderValue}
          onChange={handleSliderChange}
        />
      </div>
      <div style={{ flex: '1', height: '300px', width: '300px' }}>
        <ThreeScene sliderValue={sliderValue} />
      </div>
    </div>
  );
}
