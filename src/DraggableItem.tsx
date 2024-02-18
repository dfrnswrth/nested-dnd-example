import React, { useState }from 'react';
import {DndContext, useDraggable, useDroppable, MouseSensor, TouchSensor, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import type { Item, Group } from "./state";

export const DraggableItem: React.FC<{item: Item | Group}> = ({ item }) => {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    padding: '10px',
    border: item.type === 'item' ? '1px solid #ccc' : '2px solid #000',
    margin: '5px',
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {item.content}
      {item.type === 'group' && (
        <div style={{paddingLeft: '20px'}}>
          {item.items.map(subItem => <DraggableItem key={subItem.id} item={subItem} />)}
        </div>
      )}
    </div>
  );
};
