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
      assignees: [],
    },
    editingTaskId: null,
    activeFilters: [],
    highlightedParentId: null,
    tooltipTimer: null,
    tooltipDelay: 300, // Delay in milliseconds
    users: [],
    showUserModal: false,
    newUser: {
      firstName: "",
      lastName: "",
      githubUsername: "",
    },

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
          isMilestone: sprintCount % 4 === 1,
          isUnassigned: false,
          sprintNumber: sprintCount.toString(),
          milestoneNumber: Math.ceil(sprintCount / 4),
          //milestoneNumber: sprintCount % 4 === 0 ? milestoneCount++ : null,
        });
        currentDate.setDate(currentDate.getDate() + 7);
        sprintCount++;
      }
    },

    scrollToCurrentDate() {
      const currentDate = new Date();
      let targetSprintIndex = 0;

      for (let i = 1; i < this.weeks.length; i++) {
        const [startDateStr, endDateStr] = this.weeks[i].dateRange.split(" - ");
        const endDate = new Date(endDateStr);

        if (currentDate <= endDate) {
          targetSprintIndex = i;
          break;
        }
      }
      // targetSprintIndex = 10; // Testing
      if (targetSprintIndex > 0) {
        const targetElement = document.querySelector(
          `[data-sprint-index="${targetSprintIndex}"]`,
        );
        if (targetElement) {
          // Scroll the target element to be 100px from the top of the viewport
          const yOffset = -100;
          const y =
            targetElement.getBoundingClientRect().top +
            window.pageYOffset +
            yOffset;

          window.scrollTo({ top: y, behavior: "smooth" });

          // Highlight the row temporarily
          targetElement.classList.add("bg-yellow-200");
          setTimeout(() => {
            targetElement.classList.remove("bg-yellow-200");
          }, 2000);
        }
      }
    },

    addUser() {
      if (
        this.newUser.firstName &&
        this.newUser.lastName &&
        this.newUser.githubUsername
      ) {
        this.users.push({
          id: Date.now().toString(),
          ...this.newUser,
        });
        this.showUserModal = false;
        this.newUser = {
          firstName: "",
          lastName: "",
          githubUsername: "",
        };
        this.saveToLocalStorage();
      }
    },

    getUserInitials(userId) {
      const user = this.users.find((u) => u.id === userId);
      if (user) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
      }
      return "";
    },

    getUserFullName(userId) {
      const user = this.users.find((u) => u.id === userId);
      return user ? `${user.firstName} ${user.lastName}` : "";
    },

    getAdditionalAssigneesNames(task) {
      const additionalAssignees = (task.assignees || []).slice(2);
      return additionalAssignees
        .map((userId) => this.getUserFullName(userId))
        .join(", ");
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
          assignees: [],
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
        assignees: [],
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

    validateTaskSprint(task, parentId) {
      if (!parentId || parentId === "prototype-parent") {
        return true; // No validation needed for top-level tasks or children of Prototype
      }

      const parentTask = this.tasks.find((t) => t.id === parentId);
      if (!parentTask) {
        return true; // Parent not found, assume valid
      }

      return parseInt(task.sprint) <= parseInt(parentTask.sprint);
    },

    getAvailableSprints(parentId) {
      if (!parentId || parentId === "prototype-parent") {
        return this.weeks.map((week) => week.sprintNumber);
      }

      const parentTask = this.tasks.find((t) => t.id === parentId);
      if (!parentTask) {
        return this.weeks.map((week) => week.sprintNumber);
      }

      return this.weeks
        .filter(
          (week) => parseInt(week.sprintNumber) <= parseInt(parentTask.sprint),
        )
        .map((week) => week.sprintNumber);
    },

    saveTask() {
      if (
        this.newTask.name.trim() &&
        this.newTask.projectId &&
        this.newTask.sprint !== "" &&
        this.newTask.typeId
      ) {
        if (!this.validateTaskSprint(this.newTask, this.newTask.parentId)) {
          alert(
            "Child task's sprint must be less than or equal to its parent's sprint.",
          );
          return;
        }
        const taskToSave = {
          ...this.newTask,
          description: this.newTask.description.slice(0, 1000),
          isParent: this.newTask.isParent,
          parentId: this.newTask.isParent
            ? null
            : String(this.newTask.parentId),
          assignees: this.newTask.assignees || [],
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
      localStorage.setItem("projectUsers", JSON.stringify(this.users));
    },

    loadFromLocalStorage() {
      const storedColumns = localStorage.getItem("projectColumns");
      const storedTaskTypes = localStorage.getItem("projectTaskTypes");
      const storedTasks = localStorage.getItem("projectTasks");
      const storedUsers = localStorage.getItem("projectUsers");

      if (storedColumns) {
        this.columns = JSON.parse(storedColumns);
      } else {
        this.columns = [{ name: "Overall", visible: true }];
      }
      if (storedTaskTypes) this.taskTypes = JSON.parse(storedTaskTypes);
      // Ensure 'unassigned' task type is always present
      if (!this.taskTypes.some((t) => t.id === "unassigned")) {
        this.taskTypes.unshift({
          id: "unassigned",
          name: "Unassigned",
          color: "#FCD34D",
        });
      }
      if (storedTasks) this.tasks = JSON.parse(storedTasks);
      if (storedUsers) this.users = JSON.parse(storedUsers);

      // ... (existing logic)
    },

    exportTasksToJSON() {
      const exportData = {
        taskTypes: this.taskTypes,
        tasks: this.tasks,
        users: this.users,
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
            if (
              importedData.taskTypes &&
              importedData.tasks &&
              importedData.users
            ) {
              this.taskTypes = importedData.taskTypes;
              this.tasks = importedData.tasks;
              this.users = importedData.users;
              this.saveToLocalStorage();
              this.init();
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

    async exportTasksToExcel() {
      const Excel = window.ExcelJS;
      const workbook = new Excel.Workbook();

      // Helper function to get sprint and milestone info
      const getSprintAndMilestone = (sprintNumber) => {
        const week = this.weeks.find((w) => w.sprintNumber === sprintNumber);
        // console.log(":::", this.weeks);
        if (!week) return { sprint: "Anytime", milestone: "", dueDate: "" };
        const [, endDate] = week.dateRange.split(" - ");
        return {
          sprint: `Sprint ${sprintNumber}`,
          milestone: week.milestoneNumber
            ? `Milestone ${week.milestoneNumber}`
            : "",
          dueDate: endDate,
        };
      };

      // Define styles
      const styles = {
        header: {
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF99" },
          },
          font: { bold: true },
        },
        taskType: {
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "CCE5FF" },
          },
        },
        todo: {
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF9999" },
          },
        },
        doing: {
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFCC99" },
          },
        },
        done: {
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "CCFFCC" },
          },
        },
      };

      // Process each project (column)
      for (const column of this.columns) {
        const worksheet = workbook.addWorksheet(column.name);

        // Set up headers
        const headers = [
          "Task Type",
          "Task Name",
          "Description",
          "Status",
          "Assignees",
          "Sprint",
          "Milestone",
          "Due Date",
          "Parent ID",
          "Task ID",
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.fill = styles.header.fill;
          cell.font = styles.header.font;
        });

        let parentCounter = 1;
        let childCounter = 1;

        // Group tasks by type
        const tasksByType = {};
        this.taskTypes.forEach((type) => {
          tasksByType[type.id] = this.tasks.filter(
            (task) => task.typeId === type.id && task.projectId === column.name,
          );
        });

        // Process tasks for each type
        for (const [typeId, tasks] of Object.entries(tasksByType)) {
          const typeName = this.taskTypes.find((t) => t.id === typeId).name;
          const typeRow = worksheet.addRow([typeName]);
          typeRow.getCell(1).fill = styles.taskType.fill;

          // Sort tasks: parents first, then children sorted by sprint
          const sortedTasks = tasks.sort((a, b) => {
            if (a.isParent && !b.isParent) return -1;
            if (!a.isParent && b.isParent) return 1;
            if (!a.isParent && !b.isParent) {
              return (parseInt(a.sprint) || 0) - (parseInt(b.sprint) || 0);
            }
            return 0;
          });

          for (const task of sortedTasks) {
            const taskNumber = task.isParent ? parentCounter++ : childCounter++;
            const { sprint, milestone, dueDate } = getSprintAndMilestone(
              task.sprint,
            );
            const assignees = task.assignees
              .map((id) => this.getUserInitials(id))
              .join(", ");
            const parentId = task.isParent ? task.id : task.parentId;
            const taskId = task.id;
            const taskName = `${task.isParent ? taskNumber : `${taskNumber}.`}${task.name}`;

            const row = worksheet.addRow([
              "", // Task Type column is empty for individual tasks
              taskName,
              task.description,
              task.status,
              assignees,
              sprint,
              milestone,
              dueDate,
              parentId,
              taskId,
            ]);

            // Apply status color
            const statusCell = row.getCell(4);
            statusCell.fill = styles[task.status].fill;

            // Set date format for Due Date column
            const dueDateCell = row.getCell(8);
            if (dueDate) {
              dueDateCell.value = dueDate; // Keep as string
              dueDateCell.numFmt = "@"; // Set as text to preserve formatting
            }

            if (taskNumber >= 500) parentCounter = 1;
            if (childCounter > 50) childCounter = 1;
          }
        }

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            maxLength = Math.max(
              maxLength,
              cell.value ? cell.value.toString().length : 0,
            );
          });
          column.width = Math.min(Math.max(maxLength, 10), 50);
        });
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "project_data.xlsx";
      link.click();
      URL.revokeObjectURL(link.href);
    },

    exportTasksToCSV() {
      let csv =
        "Project,Task Type,Task Name,Description,Status,Assignees,Sprint,Milestone,Due Date,Parent ID,Task ID\n";
      let parentCounter = 1;
      let childCounter = 1;

      // Helper function to escape CSV fields
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return "";
        return '"' + String(field).replace(/"/g, '""') + '"';
      };

      // Helper function to get sprint and milestone info
      const getSprintAndMilestone = (sprintNumber) => {
        const week = this.weeks.find((w) => w.sprintNumber === sprintNumber);
        if (!week) return { sprint: "Anytime", milestone: "", dueDate: "" };
        const [, endDate] = week.dateRange.split(" - ");
        return {
          sprint: `Sprint ${sprintNumber}`,
          milestone: week.milestoneNumber
            ? `Milestone ${week.milestoneNumber}`
            : "",
          dueDate: endDate,
        };
      };

      // Process each project (column)
      this.columns.forEach((column) => {
        // Group tasks by type
        const tasksByType = {};
        this.taskTypes.forEach((type) => {
          tasksByType[type.id] = this.tasks.filter(
            (task) => task.typeId === type.id && task.projectId === column.name,
          );
        });

        // Process tasks for each type
        Object.entries(tasksByType).forEach(([typeId, tasks]) => {
          const typeName = this.taskTypes.find((t) => t.id === typeId).name;
          csv += `${escapeCSV(column.name)},${escapeCSV(typeName)},,,,,,,,\n`;

          // Sort tasks: parents first, then children sorted by sprint
          const sortedTasks = tasks.sort((a, b) => {
            if (a.isParent && !b.isParent) return -1;
            if (!a.isParent && b.isParent) return 1;
            if (!a.isParent && !b.isParent) {
              return (parseInt(a.sprint) || 0) - (parseInt(b.sprint) || 0);
            }
            return 0;
          });

          sortedTasks.forEach((task) => {
            const taskNumber = task.isParent ? parentCounter++ : childCounter++;
            const { sprint, milestone, dueDate } = getSprintAndMilestone(
              task.sprint,
            );
            const assignees = task.assignees
              .map((id) => this.getUserInitials(id))
              .join(", ");
            const parentId = task.isParent ? task.id : task.parentId;
            const taskId = task.id;
            const taskName = `${task.isParent ? taskNumber : `${taskNumber}.`}${task.name}`;

            csv +=
              [
                escapeCSV(column.name),
                "", // Task Type column is empty for individual tasks
                escapeCSV(taskName),
                escapeCSV(task.description),
                escapeCSV(task.status),
                escapeCSV(assignees),
                escapeCSV(sprint),
                escapeCSV(milestone),
                escapeCSV(dueDate),
                escapeCSV(parentId),
                escapeCSV(taskId),
              ].join(",") + "\n";

            if (taskNumber >= 500) parentCounter = 1;
            if (childCounter > 50) childCounter = 1;
          });
        });

        csv += "\n"; // Separator between projects
      });

      // Create and trigger download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "project_data.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
  };
}
