import React, { ReactNode, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  CollisionDetection,
  ClientRect,
  useDroppable,
  DragOverEvent,
  Active,
  Over,
  MeasuringStrategy,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import type { Item, Group, ListItem } from "./state";
import { initialData } from "./state";

export function getIntersectionRatio(
  entry: ClientRect,
  target: ClientRect
): number {
  const top = Math.max(target.top, entry.top);
  const bottom = Math.min(target.top + target.height, entry.top + entry.height);
  const height = bottom - top;

  // all we care about for our positioning is vertical overlap
  if (top < bottom) {
    const targetArea = target.height;
    const entryArea = entry.height;
    const intersectionArea = height;
    const intersectionRatio =
      intersectionArea / (targetArea + entryArea - intersectionArea);

    return Number(intersectionRatio.toFixed(4));
  }

  // Rectangles do not overlap, or overlap has an area of zero (edge/corner overlap)
  return 0;
}

const makeCustomCollisionDetection =
  (
    items: ListItem[],
    itemsToGroups: Record<string, string>
  ): CollisionDetection =>
  (args) => {
    // console.log(args);
    // console.log(items, itemsToGroups)
    const { active, collisionRect, droppableRects, droppableContainers } = args;
    let collisions = [];
    const activeType = (active.id as string).startsWith("group")
      ? "group"
      : "item";
    // console.log('active type', activeType)

    let groupTargetSeen = false;

    for (const droppableContainer of droppableContainers) {
      const { id } = droppableContainer;
      if (itemsToGroups[id as string]) {
        // skip the item, as the group rect will be handled separately...
        // it is also a droppableContainer
        continue;
      }

      const rect = droppableRects.get(id);

      if (rect) {
        const intersectionRatio = getIntersectionRatio(rect, collisionRect);

        if (0 < intersectionRatio) {
          if ((id as string).startsWith("group-target")) {
            groupTargetSeen = true;
          }
          // console.log("collision detected", intersectionRatio);
          collisions.push({
            id,
            data: { droppableContainer, value: intersectionRatio },
          });
        }
      }
    }
    if (groupTargetSeen) {
      collisions = collisions.filter(c => (c.id as string).startsWith("group-target"));
    }
    const sortedCollisions = collisions.sort((a, b) => b.data.value - a.data.value);
    // console.log('sortedCollisions', sortedCollisions)
    return sortedCollisions
  };

const Droppable: React.FC<{ id: string; children?: ReactNode }> = ({
  id,
  children,
}) => {
  const { setNodeRef } = useDroppable({ id: `group-target-${id}` });

  const style = {
    display: "block",
    height: "50px",
    width: "50%",
    background: "#333",
    margin: "20px",
    padding: "10px",
  };

  return (
    <div style={style} ref={setNodeRef}>
      {children || <></>}
    </div>
  );
};

const SortableItem: React.FC<{
  item: ListItem;
  activeId: string | null;
  flattenedItems: Record<string, ListItem>;
}> = ({ item, activeId, flattenedItems }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px",
    border: item.type === "item" ? "1px solid #ccc" : "2px solid #000",
    marginBottom: "5px",
  };

  if (item.type === "item") {
    return (
      <div ref={setNodeRef} style={style}>
        {item.content}
        <div
          style={{ display: "block", width: "20px", height: "20px" }}
          {...listeners}
          {...attributes}
        >
          H
        </div>
      </div>
    );
  }
  const { items } = item;
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ paddingLeft: "20px" }}>
        <Droppable id={item.id} />
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {" "}
          {items.map((item) => (
            <SortableItem key={item.id} item={item} activeId={activeId} flattenedItems={flattenedItems}/>
          ))}
        </SortableContext>
        <div
          style={{ display: "block", width: "20px", height: "20px" }}
          {...listeners}
          {...attributes}
        >
          H
        </div>
      </div>
    </div>
  );
};

const moveItem = (from: number[], to: number[], items: ListItem[]): ListItem[] => {
  let data = [...items];
  let itemToMove: ListItem | undefined;

  if (from[0] < to[0] && from.length < to.length) {
    // If we're moving an item to a lower index, we need to adjust the 'to' index
    // if from.length === 2, we're moving an item from a group, so we're not impacting the top-level shape
    to[0] -= 1;
  }

  // Extract item from its current position
  if (from.length === 1) {
    itemToMove = data.splice(from[0], 1)[0];
  } else {
    let group: Group = data[from[0]] as Group;
    itemToMove = group.items.splice(from[1], 1)[0];
  }

  // If the item to move does not exist, return the original data unmodified
  if (!itemToMove) {
    return data;
  }
  if (to[0] === from[0]) {
    console.log('same group', to, from)
    return data;
  }

  // Insert item into its new position
  if (to.length === 1) {
    data.splice(to[0], 0, itemToMove);
  } else {
    let group: Group = data[to[0]] as Group;
    group.items.splice(to[1], 0, itemToMove as Item); // Assumption: 'to' will not point to a non-existent group
  }

  return data;
};

const computeItemsToGroups = (items: ListItem[]) => {
  return items.reduce((acc, item) => {
    if (item.type === "group") {
      for (const subItem of item.items) {
        acc[subItem.id] = item.id;
      }
    }
    return acc;
  }, {} as Record<string, string>);
}

const computeFlattenedItems = (items: ListItem[]) => {
  return items.reduce((acc, item) => {
    if (item.type === "group") {
      acc[item.id] = item;
      for (const subItem of item.items) {
        acc[subItem.id] = subItem;
      }
    } else {
      acc[item.id] = item;
    }
    return acc;
  }, {} as Record<string, ListItem>);
}


export const VerticalListView: React.FC = () => {
  const [items, setItems] = useState<ListItem[]>(initialData);
  const [clonedItems, setClonedItems] = useState<ListItem[] | null>(null);
  const [flattenedItems, setFlattenedItems] = useState<Record<string, ListItem>>(computeFlattenedItems(items));
  const [itemsToGroups, setItemsToGroups] = useState<Record<string, string>>(computeItemsToGroups(items));
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active?.id as string);
    const clonedItems = structuredClone(items)
    setClonedItems(clonedItems);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over } = event;
    // console.log(over?.id)
    setOverId(over?.id as string);
    // console.log(items.filter(i => i.id === overId)[0]?.type)
  };

  const arrangeItems = (items: ListItem[], active: Active, over: Over) => {
    let fromIndices: number[] = [];
    let toIndices: number[] = []; 

    // find departure indeces
    let activeIndex = items.findIndex((item) => item.id === active.id);
    if (activeIndex === -1) {
      // active item is not at the top level
      // so we find it
      const groupId = itemsToGroups[active.id];
      if (groupId) {
        let fromGroupIndex = items.findIndex((item) => item.id === groupId);
        activeIndex = (items[fromGroupIndex] as Group).items.findIndex(
          (item) => item.id === active.id
        );
        fromIndices = [fromGroupIndex, activeIndex];
      } else {
        console.log("active index not found");
      }
    } else {
      // active item is at the top level
      fromIndices = [activeIndex];
    }

    // find destination indixes
    let overIndex = items.findIndex((item) => item.id === over.id);
    if (overIndex === -1) {
      // over item is not at the top-level
      // so we find a suitable parent item
      // check if over is an item in a group
      let parentGroupId = itemsToGroups[over.id];
      let parentGroupIndex = items.findIndex((item) => item.id === parentGroupId);

      if (parentGroupIndex !== -1) {
        // over item is in a group - so we treat the group like any other top-level item
        toIndices = [parentGroupIndex];
      } else {
        // over item is a group drop target so add the item to the group
        let groupId = (over.id as string).slice(13);
        let groupIndex = items.findIndex((item) => item.id === groupId);
        let itemIndex = (items[groupIndex] as Group).items.length;
        toIndices = [groupIndex, itemIndex];
      }
    } else {
      // over item is at the top level
      toIndices = [overIndex];
    }

    console.log("from", fromIndices, "to", toIndices);
    const newItems = moveItem(fromIndices, toIndices, items);
    return newItems;
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    // Ensure we have valid active and over items
    if (!active || !over) {
      return;
    }

    console.log('Over', over?.id)
    const newItems = arrangeItems(items, active, over);
    setItems(newItems);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    // Ensure we have valid active and over items
    if (!active || !over) {
      return;
    }
    const newItems = arrangeItems(items, active, over);
    setItems(newItems);
    setActiveId(null);
    setOverId(null);
  };

  useEffect(() => {
    const newFlattenedItems = computeFlattenedItems(items);
    const newItemsToGroups = computeItemsToGroups(items);
    setFlattenedItems(newFlattenedItems);
    setItemsToGroups(newItemsToGroups);
  }, [items])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={makeCustomCollisionDetection(items, itemsToGroups)}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} item={item} activeId={activeId} flattenedItems={flattenedItems}/>
        ))}
        <DragOverlay>
          {activeId ? (
            <SortableItem
              activeId={activeId}
              flattenedItems={flattenedItems}
              item={flattenedItems[activeId]}
            />
          ) : null}
        </DragOverlay>
      </SortableContext>
    </DndContext>
  );
};
