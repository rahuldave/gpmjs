function gridData() {
  return {
    columns: [{ name: "Overall", visible: true }],
    weeks: [],
    taskTypes: [{ id: "unassigned", name: "Unassigned", color: "#FCD34D" }],
    tasks: [],
    showColumnModal: false,
    showTaskTypeModal: false,
    showTaskModal: false,
    newColumnName: "",
    newTaskType: { name: "", color: "#3B82F6" },
    newTask: {
      name: "",
      projectId: "Overall",
      sprint: "0",
      typeId: "unassigned",
      status: "todo",
      description: "",
      isParent: false,
      parentId: "prototype-parent",
    },
    editingTaskId: null,
    activeFilters: [],
    highlightedParentId: null,
    tooltipTimer: null,
    tooltipDelay: 300, // Delay in milliseconds

    init() {
      this.generateWeeks();
      this.loadFromLocalStorage();
      this.initializeDefaultTask();
    },

    generateWeeks() {
      this.weeks = [
        { dateRange: "Anytime", isUnassigned: true, sprintNumber: "0" },
      ];
      const startDate = new Date("2024-07-09");
      const endDate = new Date("2024-12-31");
      let currentDate = new Date(startDate);
      let sprintCount = 1;
      let milestoneCount = 1;

      while (currentDate <= endDate) {
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        this.weeks.push({
          dateRange: `${this.formatDate(currentDate)} - ${this.formatDate(weekEnd)}`,
          isMilestone: sprintCount % 4 === 0,
          isUnassigned: false,
          sprintNumber: sprintCount.toString(),
          milestoneNumber: sprintCount % 4 === 0 ? milestoneCount++ : null,
        });
        currentDate.setDate(currentDate.getDate() + 7);
        sprintCount++;
      }
    },

    initializeDefaultTask() {
      if (!this.tasks.some((task) => task.name === "Prototype")) {
        this.tasks.push({
          id: "prototype-parent",
          name: "Prototype",
          projectId: "Overall",
          sprint: "0",
          typeId: "unassigned",
          status: "todo",
          description: "Prototype Parent",
          isParent: true,
          parentId: null,
        });
        this.saveToLocalStorage();
      }
    },

    resetNewTask() {
      this.newTask = {
        name: "",
        projectId: "Overall",
        sprint: "0",
        typeId: "unassigned",
        status: "todo",
        description: "",
        isParent: false,
        parentId: "prototype-parent",
      };
    },

    // getFilteredTasksForSprintAndProject(sprintIndex, project) {
    //   const sprint = sprintIndex === 0 ? "unassigned" : sprintIndex.toString();
    //   return this.tasks.filter(
    //     (task) => task.sprint === sprint && task.projectId === project,
    //   );
    // },
    getFilteredTasksForSprintAndProject(sprintIndex, project) {
      return this.tasks.filter(
        (task) =>
          task.sprint === sprintIndex.toString() &&
          task.projectId === project &&
          (this.activeFilters.length === 0 ||
            this.activeFilters.includes(task.typeId)),
      );
    },

    formatDate(date) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    },

    addColumn() {
      if (this.newColumnName.trim()) {
        this.columns.push({ name: this.newColumnName.trim(), visible: true });
        this.newColumnName = "";
        this.showColumnModal = false;
        this.saveToLocalStorage();
      }
    },

    isColorUnique(color) {
      return !this.taskTypes.some((type) => type.color === color);
    },

    addTaskType() {
      if (
        this.newTaskType.name.trim() &&
        this.isColorUnique(this.newTaskType.color)
      ) {
        this.taskTypes.push({
          id: Date.now().toString(),
          name: this.newTaskType.name.trim(),
          color: this.newTaskType.color,
        });
        this.newTaskType = { name: "", color: "#3B82F6" };
        this.showTaskTypeModal = false;
        this.saveToLocalStorage();
      } else if (!this.isColorUnique(this.newTaskType.color)) {
        alert("This color is already in use. Please choose a different color.");
      }
    },

    saveTask() {
      if (
        this.newTask.name.trim() &&
        this.newTask.projectId &&
        this.newTask.sprint !== "" &&
        this.newTask.typeId
      ) {
        const taskToSave = {
          ...this.newTask,
          description: this.newTask.description.slice(0, 1000),
          isParent: this.newTask.isParent,
          parentId: this.newTask.isParent
            ? null
            : String(this.newTask.parentId),
        };

        if (this.editingTaskId) {
          const index = this.tasks.findIndex(
            (t) => t.id === this.editingTaskId,
          );
          if (index !== -1) {
            this.tasks[index] = { ...taskToSave, id: this.editingTaskId };
          }
        } else {
          this.tasks.push({
            id: Date.now().toString(),
            ...taskToSave,
          });
        }
        this.closeTaskModal();
        this.saveToLocalStorage();
      }
    },

    deleteTask(taskId) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        const task = this.tasks[taskIndex];
        if (task.isParent) {
          // Set parentId to null for all child tasks
          this.tasks.forEach((t) => {
            if (String(t.parentId) === String(taskId)) {
              t.parentId = null;
            }
          });
        }
        this.tasks.splice(taskIndex, 1);
        this.saveToLocalStorage();
      }
    },

    getParentTasks() {
      const ltasks = this.tasks.filter((task) => task.isParent);
      return ltasks;
    },

    editTask(task) {
      this.editingTaskId = task.id;
      this.newTask = { ...task };
      this.showTaskModal = true;
    },

    closeTaskModal() {
      this.showTaskModal = false;
      this.editingTaskId = null;
      this.resetNewTask();
    },

    getTaskTypeColor(typeId) {
      const type = this.taskTypes.find((t) => t.id == typeId);
      return type ? type.color : "#cccccc";
    },

    getTaskTypeColorWithAlpha(typeId) {
      const color = this.getTaskTypeColor(typeId);
      return this.adjustColorTransparency(color, 0.2); // Increased transparency
    },

    adjustColorTransparency(color, alpha) {
      if (color.startsWith("#")) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (color.startsWith("rgb")) {
        return color.replace("rgb", "rgba").replace(")", `, ${alpha})`);
      }
      return color;
    },

    getStatusColor(status) {
      const colors = {
        todo: "#EF4444",
        doing: "#F59E0B",
        done: "#10B981",
      };
      return colors[status] || "#cccccc";
    },

    toggleTaskTypeFilter(typeId) {
      typeId = String(typeId);
      const index = this.activeFilters.indexOf(typeId);
      if (index === -1) {
        this.activeFilters = [typeId]; // Set the clicked type as the only active filter
      } else {
        this.activeFilters = []; // Clear all filters if the active one is clicked again
      }
    },

    isTaskVisible(task) {
      return (
        this.activeFilters.length === 0 ||
        this.activeFilters.includes(String(task.typeId))
      );
    },

    toggleColumnVisibility(columnName) {
      const column = this.columns.find((c) => c.name === columnName);
      if (column) {
        column.visible = !column.visible;
        this.saveToLocalStorage();
      }
    },

    getVisibleColumns() {
      return this.columns.filter((c) => c.visible);
    },

    showAllColumns() {
      this.columns.forEach((column) => (column.visible = true));
      this.saveToLocalStorage();
    },

    areAllColumnsVisible() {
      return this.columns.every((column) => column.visible);
    },

    toggleHighlightChildren(taskId, event) {
      event.stopPropagation(); // Prevent task edit modal from opening
      this.highlightedParentId =
        this.highlightedParentId === taskId ? null : taskId;
    },

    getChildCount(taskId) {
      return this.tasks.filter(
        (task) => String(task.parentId) === String(taskId),
      ).length;
    },

    isTaskHighlighted(task) {
      return (
        this.highlightedParentId === task.id ||
        (this.highlightedParentId && task.parentId === this.highlightedParentId)
      );
    },

    showTooltip(event, taskId) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = setTimeout(() => {
        const task = this.tasks.find((t) => t.id === taskId);
        if (task) {
          const tooltip = document.getElementById("tooltip-container");
          tooltip.textContent = task.description;
          tooltip.style.display = "block";

          const rect = event.target.getBoundingClientRect();
          tooltip.style.left = `${rect.left + window.scrollX}px`;
          tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

          setTimeout(() => {
            tooltip.style.opacity = "1";
          }, 10);
        }
      }, this.tooltipDelay);
    },

    hideTooltip() {
      clearTimeout(this.tooltipTimer);
      const tooltip = document.getElementById("tooltip-container");
      tooltip.style.opacity = "0";
      setTimeout(() => {
        tooltip.style.display = "none";
      }, 300);
    },

    clearAndReinitialize() {
      if (
        confirm(
          "Are you sure you want to clear all data and reinitialize the system? This action cannot be undone.",
        )
      ) {
        localStorage.clear();
        this.columns = [{ name: "Overall", visible: true }];
        this.taskTypes = [
          { id: "unassigned", name: "Unassigned", color: "#FCD34D" },
        ];
        this.tasks = [];
        this.generateWeeks();
        this.initializeDefaultTask();
        this.saveToLocalStorage();
        alert("System has been reinitialized.");
      }
    },

    saveToLocalStorage() {
      localStorage.setItem("projectColumns", JSON.stringify(this.columns));
      localStorage.setItem("projectTaskTypes", JSON.stringify(this.taskTypes));
      localStorage.setItem("projectTasks", JSON.stringify(this.tasks));
    },

    loadFromLocalStorage() {
      const storedColumns = localStorage.getItem("projectColumns");
      const storedTaskTypes = localStorage.getItem("projectTaskTypes");
      const storedTasks = localStorage.getItem("projectTasks");

      if (storedColumns) {
        this.columns = JSON.parse(storedColumns);
      } else {
        this.columns = [{ name: "Overall", visible: true }];
      }
      if (storedTaskTypes) this.taskTypes = JSON.parse(storedTaskTypes);
      if (storedTasks) this.tasks = JSON.parse(storedTasks);

      // Ensure 'unassigned' task type is always present
      if (!this.taskTypes.some((t) => t.id === "unassigned")) {
        this.taskTypes.unshift({
          id: "unassigned",
          name: "Unassigned",
          color: "#FCD34D",
        });
      }
    },

    exportTasksToJSON() {
      const exportData = {
        taskTypes: this.taskTypes,
        tasks: this.tasks,
      };
      const dataJSON = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataJSON], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project_data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    importTasksFromJSON(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.taskTypes && importedData.tasks) {
              this.taskTypes = importedData.taskTypes;
              this.tasks = importedData.tasks;
              this.saveToLocalStorage();
              this.init(); // Re-initialize the application
              alert("Project data imported successfully!");
            } else {
              throw new Error("Invalid file format");
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
            alert(
              "Error importing project data. Please check the file format.",
            );
          }
        };
        reader.readAsText(file);
      }
    },
  };
}
