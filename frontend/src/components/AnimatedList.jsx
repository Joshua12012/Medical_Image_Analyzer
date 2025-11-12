import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "./AnimatedList.css";

const AnimatedItem = ({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
}) => {
  return (
    // animate when item enters the visible scroll area; add small delay per-index for stagger
    <motion.div
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.96, opacity: 0, y: -6 }}
      whileInView={{ scale: 1, opacity: 1, y: 0 }}
      viewport={{ amount: 0.4, once: false }}
      transition={{ duration: 0.01, delay: delay*0.5, ease:"easeOut" }}
      style={{ marginBottom: "0.75rem", cursor: "pointer" , willChange:"transform, opacity"}}
    >
      {children}
    </motion.div>
  );
};

const AnimatedList = ({
  items = [],
  onItemSelect,
  renderItem,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxHeight, // optional string value, e.g. "calc(100vh - 160px)"
}) => {
  const listRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) onItemSelect(items[selectedIndex], selectedIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedItem) {
      const extraMargin = 40;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  const containerClasses = `scroll-list ${className} ${
    displayScrollbar ? "" : "no-scrollbar"
  }`;

  return (
    <div className={`scroll-list-container`}>
      <div
        ref={listRef}
        className={containerClasses}
        onScroll={handleScroll}
        style={{
          overflowY: "auto",
          paddingRight: 4,
          maxHeight: maxHeight ? maxHeight : undefined,
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={item?.chat_id ?? item?._id ?? index}
            delay={0.04 * index}
            index={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => {
              setSelectedIndex(index);
              if (onItemSelect) onItemSelect(item, index);
            }}
          >
            {typeof renderItem === "function" ? (
              renderItem(item, index, selectedIndex === index)
            ) : (
              <div
                className={`item ${
                  selectedIndex === index ? "selected" : ""
                } ${itemClassName}`}
              >
                <p className="item-text">{String(item)}</p>
              </div>
            )}
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <div>
          <div
            className="top-gradient"
            style={{ opacity: topGradientOpacity }}
          />
        </div>
      )}
    </div>
  );
};

export default AnimatedList;
