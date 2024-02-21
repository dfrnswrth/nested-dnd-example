import React, { ReactNode, useEffect, useState, forwardRef } from "react";
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
  DragCancelEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { moveItem } from "./move";

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
    // const activeType = (active.id as string).startsWith("group")
    //   ? "group"
    //   : "item";
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
          if ((id as string).startsWith("DROP_TARGET")) {
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
    // if (groupTargetSeen) {
    //   collisions = collisions.filter(c => (c.id as string).startsWith("DROP_TARGET"));
    // }
    const sortedCollisions = collisions.sort(
      (a, b) => b.data.value - a.data.value
    );
    console.log("sortedCollisions", sortedCollisions);
    return sortedCollisions;
  };

const Droppable: React.FC<{
  id: string;
  style: Record<string, string | number>;
  children?: ReactNode;
}> = ({ id, style, children }) => {
  const { setNodeRef } = useDroppable({ id: `DROP_TARGET-${id}` });

  return (
    <div style={style} ref={setNodeRef}>
      {children || <></>}
    </div>
  );
};

const PresentationalItem = forwardRef<HTMLDivElement, {item: ListItem, activeId: string}>(({ item, activeId, ...props}, ref) => {
  const style = {
    padding: "10px",
    border: item.type === "item" ? "1px solid #ccc" : "2px solid #000",
    marginBottom: "5px",
  };

  if (item.type === "item") {
    return (
      <div ref={ref} style={style} {...props}>
        {item.content}
        <div style={{ display: "block", width: "20px", height: "20px" }}>H</div>
      </div>
    );
  }
  const { items } = item;
  return (
    <div {...props} ref={ref} style={style}>
      <div style={{ paddingLeft: "20px" }}>
          {" "}
          {items.map((item) => (
            <PresentationalItem key={item.id} item={item} activeId={activeId} />
          ))}
        <div
          style={{ display: "block", width: "20px", height: "20px" }}
        >
          H
        </div>
      </div>
    </div>
  );
});
const SortableItem: React.FC<{
  item: ListItem;
  activeId: string | null;
}> = ({ item, activeId }) => {
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
        <Droppable
          id={item.id}
          style={{
            display: "block",
            height: "50px",
            width: "50%",
            background: "#333",
            margin: "20px",
            padding: "10px",
          }}
        />

        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {" "}
          {items.map((item) => (
            <SortableItem key={item.id} item={item} activeId={activeId} />
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

const computeItemsToGroups = (items: ListItem[]) => {
  return items.reduce((acc, item) => {
    if (item.type === "group") {
      for (const subItem of item.items) {
        acc[subItem.id] = item.id;
      }
    }
    return acc;
  }, {} as Record<string, string>);
};

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
};

export const VerticalListView: React.FC = () => {
  const [items, setItems] = useState<ListItem[]>(initialData);
  const [clonedItems, setClonedItems] = useState<ListItem[] | null>(null);
  const [flattenedItems, setFlattenedItems] = useState<
    Record<string, ListItem>
  >(computeFlattenedItems(items));
  const [itemsToGroups, setItemsToGroups] = useState<Record<string, string>>(
    computeItemsToGroups(items)
  );
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active?.id as string);
    const clonedItems = structuredClone(items);
    setClonedItems(clonedItems);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    if (clonedItems) {
      setItems(clonedItems);
    }
    setClonedItems(null);
    setActiveId(null);
  };

  const getActiveIndex = (activeId: string): number[] => {
    let indices: number[] = [];
    let activeIndex = items.findIndex((item) => item.id === activeId);
    if (activeIndex === -1) {
      // active item is not at the top level
      // so we find it
      const groupId = itemsToGroups[activeId];
      if (groupId) {
        let fromGroupIndex = items.findIndex((item) => item.id === groupId);
        activeIndex = (items[fromGroupIndex] as Group).items.findIndex(
          (item) => item.id === activeId
        );
        if (activeIndex !== -1) {
          indices = [activeIndex];
        }
      } else {
        console.log("active index not found");
      }
    } else {
      // active item is at the top level
      indices = [activeIndex];
    }
    console.log('ACTIVE INDEX', indices)
    return indices;
  }

  const getOverIndex = (overId: string): number[] => {
    // find destination indixes
    let overIndex: number;

    if (overId.startsWith("DROP_TARGET")) {
      // special cases
      let tempOverId = (overId).slice(12);
      console.log('temp over id', tempOverId)
      if (tempOverId === "TOP" || tempOverId === "BOTTOM") {
        overIndex = tempOverId === "TOP" ? 0 : items.length;
        return [overIndex];
      } else {
        // tempOverId === "groupN"
        overIndex = items.findIndex((item) => item.id === tempOverId);
        if (overIndex === -1) {
          console.log("groups should always be top-level, so this should never happen")
          debugger;
        }
        const itemLength = (items[overIndex] as Group).items?.length || 0;
        // this is the only case where we return two indices
        return [overIndex, itemLength];
      }
    }

    overIndex = items.findIndex((item) => item.id === overId);
    if (overIndex === -1) {
      let parentGroupId = itemsToGroups[overId];
      if (!parentGroupId) {
        console.log("groups should always be top-level, so this should never happen")
        debugger;
      }
      let parentGroupIndex = items.findIndex((item) => item.id === parentGroupId);
      if (parentGroupIndex === -1) {
        console.log("groups should always be top-level, so this should never happen")
        debugger;
      }
      return [parentGroupIndex];
    }
    return [overIndex];


    // // console.log("over index", overIndex, over, items, overGroupDropTarget);
    // if (overBoundaryTarget) {
    //   toIndices = [overIndex];
    //   // console.log('IN BOUNDARY')
    // } else {
    //   if (overIndex === -1) {
    //     let parentGroupId = itemsToGroups[over.id];
    //     let parentGroupIndex = items.findIndex(
    //       (item) => item.id === parentGroupId
    //     );
    //     if (parentGroupIndex !== -1) {
    //       // we're over a group member
    //       overIndex = parentGroupIndex;
    //     }
    //   }
    //   if (overIndex !== -1) {
    //     toIndices = [overIndex];
    //     if (overGroupDropTarget) {
    //       let itemLength = (items[overIndex] as Group).items?.length || 0;
    //       let itemIndex = itemLength;
    //       toIndices.push(itemIndex);
    //     }
    //   } else {
    //     debugger;
    //   }
    //   // console.log("\n\nDFG", draggingFromGroup, fromIndices, toIndices, items);
    //   if (draggingFromGroup && fromIndices[0] === toIndices[0]) {
    //     // console.log("condition met");
    //     toIndices = [toIndices[0]++];
    //   }

    // }
  }

  const arrangeItems = (items: ListItem[], active: Active, over: Over) => {
    console.log("\n\nArrange:");
    let fromIndices: number[] = [];
    let toIndices: number[] = [];

    const activeId = active.id.toString();
    const overId = over.id.toString();

    fromIndices = getActiveIndex(activeId);
    if (fromIndices.length === 0) {
      return items;
    }

    toIndices = getOverIndex(overId);

    const activeType = activeId.startsWith("group") ? "group" : "item";
    let overType: "group" | "item" | "boundary" = "item";
    if (overId.startsWith("DROP_TARGET")) {
      const tId = overId.slice(12);
      if (tId === "TOP" || tId === "BOTTOM") {
        overType = "boundary";
      }
      if (tId.startsWith("group")) {
        overType = "group";
      }
    } else {
      overType = itemsToGroups[overId] ? "group" : "item";
    }

    if (activeType === "group" && overType === "group") {
      return items;
    }


    // if (overIndex === -1) {
    //   debugger;
    //   console.log('over nested item', over.id)
    //   // // over item is not at the top-level
    //   // // so we find a suitable parent item
    //   // // check if over is an item in a group
    //   // let parentGroupId = itemsToGroups[over.id];
    //   // let parentGroupIndex = items.findIndex((item) => item.id === parentGroupId);

    //   // if (parentGroupIndex !== -1) {
    //   //   // over item is in a group - so we treat the group like any other top-level item
    //   //   toIndices = [parentGroupIndex];
    //   // } else {
    //   //   if (!activeIsGroup) {
    //   //     // over item is a group drop target so add the item to the group
    //   //     let groupId = (over.id as string).slice(12);
    //   //     console.log('group id', groupId)
    //   //     let groupIndex = items.findIndex((item) => item.id === groupId);
    //   //     let itemIndex = (items[groupIndex] as Group).items.length;
    //   //     toIndices = [groupIndex, itemIndex];
    //   //   }
    //   // }
    // } else {
    //   // over item is at the top level
    //   toIndices = [overIndex];
    // }

    console.log("from", fromIndices);
    console.log("to", toIndices);
    console.log("items", items);
    // if (fromIndices.length === 0 || toIndices.length === 0) {
    //   return items;
    // }
    const newItems = moveItem(fromIndices, toIndices, items);
    return newItems;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    // Ensure we have valid active and over items
    if (!active || !over) {
      return;
    }

    console.log("\n\nOver:", over?.id);
    const newItems = arrangeItems(items, active, over);
    console.log("DO ITEMS", JSON.stringify(newItems));
    setItems(newItems);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    // Ensure we have valid active and over items
    if (!active || !over) {
      return;
    }
    console.log("\n\nEnd:", active?.id, over?.id);
    const newItems = arrangeItems(items, active, over);
    setItems(newItems);
    setActiveId(null);
    setClonedItems(null);
  };

  useEffect(() => {
    const newItemsToGroups = computeItemsToGroups(items);
    setItemsToGroups(newItemsToGroups);
  }, [items]);

  console.log(
    "RENDER ITEMS",
    items.map((i) => i.id)
  );


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={makeCustomCollisionDetection(items, itemsToGroups)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
        // draggable: {
        //   strategy: MeasuringStrategy.Always,
        // },
        // dragOverlay: {
        //   strategy: MeasuringStrategy.Always,
        // },
      }}
    >
      <Droppable
        id={`TOP`}
        style={{
          width: "100%",
          height: "10px",
          opacity: 0,
        }}
        />
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} item={item} activeId={activeId} />
        ))}
        <DragOverlay>
          {
            // render the overlay outside
            activeId ? (
              <PresentationalItem
                activeId={activeId}
                item={flattenedItems[activeId]}
              />
            ) : null
          }
        </DragOverlay>
      </SortableContext>
      <Droppable
        id={`BOTTOM`}
        style={{
          width: "100%",
          height: "10px",
          opacity: 0,
        }}
        />
    </DndContext>
  );
};
