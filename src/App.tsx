import React, { useState }from 'react';
import {DndContext, useDraggable, useDroppable, MouseSensor, TouchSensor, PointerSensor, KeyboardSensor, useSensor, useSensors} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, } from '@dnd-kit/sortable';

import './App.css';

import { VerticalListView} from './VerticalListView';

// --- Draggable Item


// --- Vertical List View Component



// --- App

function App() {
  return (
    <div className="App">
      <VerticalListView />
    </div>
  );
}

export default App;
