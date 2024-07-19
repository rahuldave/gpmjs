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
      comment: "",
      isRepetitive: false,
    },
    editingTaskId: null,
    activeFilters: {
      taskTypes: [],
      users: [],
    },
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
    selectedUser: null,
    availableSprints: [],

    selectUser(githubUsername) {
      //dont think this is used
      this.selectedUser = githubUsername;
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
          comment: "",
          isRepetitive: false,
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
        comment: "",
        isRepetitive: false,
      };
      this.updateSprintOptions();
    },

    // getFilteredTasksForSprintAndProject(sprintIndex, project) {
    //   const sprint = sprintIndex === 0 ? "unassigned" : sprintIndex.toString();
    //   return this.tasks.filter(
    //     (task) => task.sprint === sprint && task.projectId === project,
    //   );
    // },
    getFilteredTasksForSprintAndProject(sprintIndex, project) {
      return this.tasks.filter((task) => {
        // For sprint 0 (Anytime), only show non-repetitive tasks
        if (sprintIndex === "0") {
          return (
            !task.isRepetitive &&
            task.sprint === "0" &&
            task.projectId === project &&
            this.isTaskVisible(task)
          );
        }
        return (
          ((task.isRepetitive && sprintIndex !== 0) ||
            task.sprint === sprintIndex.toString()) &&
          task.projectId === project &&
          this.isTaskVisible(task)
        );
        // (this.activeFilters.length === 0 ||
        //   this.activeFilters.includes(task.typeId)),
      });
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
    updateSprintOptions() {
      const availableSprints = this.getAvailableSprints(this.newTask.parentId);

      // If the current sprint is still available, keep it
      if (!availableSprints.includes(this.newTask.sprint)) {
        this.newTask.sprint = availableSprints[0];
      }

      this.availableSprints = availableSprints;
    },
    saveTask() {
      if (
        this.newTask.name.trim() &&
        this.newTask.projectId &&
        // this.newTask.sprint !== "" &&
        this.newTask.typeId
      ) {
        if (
          !this.newTask.isRepetitive &&
          !this.validateTaskSprint(this.newTask, this.newTask.parentId)
        ) {
          alert(
            "Child task's sprint must be less than or equal to its parent's sprint.",
          );
          return;
        }
        const taskToSave = {
          ...this.newTask,
          description: this.newTask.description.slice(0, 1000),
          isRepetitive: this.newTask.isRepetitive,
          sprint: this.newTask.isRepetitive
            ? "repetitive"
            : this.newTask.sprint, // Use 'repetitive' for repetitive tasks
          comment: this.newTask.comment || "",
          isParent: this.newTask.isParent,
          parentId: this.newTask.isParent
            ? null
            : String(this.newTask.parentId),
          assignees: this.newTask.assignees || [],
          // sprintStatuses: this.newTask.isRepetitive ? {} : undefined, //undefined will be default
        };
        // console.log(">>>", taskToSave);
        if (taskToSave.isRepetitive) {
          if (!taskToSave.sprintStatuses) {
            taskToSave.sprintStatuses = {};
          }
          if (this.currentSprintIndex) {
            taskToSave.sprintStatuses[String(this.currentSprintIndex)] =
              this.newTask.status;
          }
          // Remove sprint 0 status if it exists
          delete taskToSave.sprintStatuses["0"];
          if (this.newTask.repetitiveStatus) {
            taskToSave.status = this.newTask.repetitiveStatus;
          }
        } else {
          taskToSave.status = this.newTask.status;
        }
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
        if (task.isRepetitive) {
          if (
            confirm(
              "This is a repetitive task. This will DELETE ALL instances!",
            )
          ) {
            // Delete all instances of the repetitive task
            this.tasks.splice(taskIndex, 1);
          }
        } else {
          if (task.isParent) {
            // Set parentId to null for all child tasks
            this.tasks.forEach((t) => {
              if (String(t.parentId) === String(taskId)) {
                t.parentId = null;
              }
            });
          }
          this.tasks.splice(taskIndex, 1);
        }
        this.saveToLocalStorage();
      }
    },

    getParentTasks() {
      const ltasks = this.tasks.filter((task) => task.isParent);
      return ltasks;
    },
    handleRepetitiveChange() {
      if (this.newTask.isRepetitive && this.newTask.sprint === "0") {
        // If task becomes repetitive and was in Anytime sprint, move it to the first regular sprint
        this.newTask.sprint = "1";
      }
    },

    editTask(task, currentSprintIndex) {
      this.editingTaskId = task.id;
      this.newTask = { ...task };
      this.currentSprintIndex = currentSprintIndex;
      if (this.newTask.isRepetitive) {
        this.newTask.repetitiveStatus = this.newTask.status;
        this.newTask.status =
          this.newTask.sprintStatuses?.[String(currentSprintIndex)] ||
          this.newTask.status ||
          "todo";
      }

      this.updateSprintOptions();
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

    getTaskStatus(task, sprintIndex) {
      if (task.isRepetitive) {
        // console.log(
        //   "REP",
        //   task.isRepetitive,
        //   sprintIndex,
        //   task.sprintStatuses?.[String(sprintIndex)],
        //   task.status,
        // );
        return (
          task.sprintStatuses?.[String(sprintIndex)] || task.status || "todo"
        );
      }
      return task.status || "todo";
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
      const index = this.activeFilters.taskTypes.indexOf(typeId);
      if (index === -1) {
        this.activeFilters.taskTypes.push(typeId); // Set the clicked type as the only active filter
      } else {
        this.activeFilters.taskTypes = this.activeFilters.taskTypes.filter(
          (id) => id !== typeId,
        ); // Clear this filter
      }
    },

    toggleUserFilter(userId) {
      userId = String(userId);
      const index = this.activeFilters.users.indexOf(userId);
      if (index === -1) {
        this.activeFilters.users.push(userId);
      } else {
        this.activeFilters.users = this.activeFilters.users.filter(
          (id) => id !== userId,
        );
      }
    },
    isTaskVisible(task) {
      const noTaskTypeFilters = this.activeFilters.taskTypes.length === 0;
      const noUserFilters = this.activeFilters.users.length === 0;

      if (noTaskTypeFilters && noUserFilters) {
        return true;
      }

      const typeFilter =
        noTaskTypeFilters ||
        this.activeFilters.taskTypes.includes(String(task.typeId));
      const userFilter =
        noUserFilters ||
        task.assignees.some((assigneeId) =>
          this.activeFilters.users.includes(String(assigneeId)),
        );

      return typeFilter && userFilter;
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
        columns: this.columns, // Added columns data
        taskTypes: this.taskTypes,
        tasks: this.tasks,
        users: this.users,
        weeks: this.weeks, // Including weeks data for completeness
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
              importedData.columns &&
              importedData.taskTypes &&
              importedData.tasks &&
              importedData.users
            ) {
              this.columns = importedData.columns;
              this.taskTypes = importedData.taskTypes;
              this.tasks = importedData.tasks.map((task) => ({
                ...task,
                comment: task.comment || "",
              }));
              this.users = importedData.users;
              this.saveToLocalStorage();
              this.init();
              alert("Project data imported successfully!");
            } else {
              throw new Error("Invalid file format: Missing required data");
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
        parent: {
          font: { bold: true },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F0F0F0" },
          }, // Light gray background
        },
      };

      // Process each project (column)
      for (const column of this.columns) {
        const worksheet = workbook.addWorksheet(column.name);

        // Set up headers
        const headers = [
          "Parent Task",
          "Task",
          "Project",
          "Task Type",
          "Description",
          "Status",
          "Due Date",
          "Sprint",
          "Milestone",
          "Assignees",
          "Comment",
          "Task ID",
          "Parent Task ID",
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.fill = styles.header.fill;
          cell.font = styles.header.font;
        });

        // Get all tasks for this project
        let projectTasks = this.tasks.filter(
          (task) => task.projectId === column.name,
        );

        // Add parent tasks from other projects
        const parentIds = new Set(
          projectTasks.map((task) => task.parentId).filter((id) => id),
        );
        const parentsFromOtherProjects = this.tasks.filter(
          (task) =>
            task.isParent &&
            parentIds.has(task.id) &&
            task.projectId !== column.name,
        );
        projectTasks = [...projectTasks, ...parentsFromOtherProjects];

        // Group tasks by parent
        const taskGroups = projectTasks.reduce((groups, task) => {
          const parentId = task.isParent ? task.id : task.parentId;
          if (!groups[parentId]) {
            groups[parentId] = [];
          }
          groups[parentId].push(task);
          return groups;
        }, {});

        // Process each group
        Object.entries(taskGroups).forEach(([parentId, tasks]) => {
          // Sort tasks: children by sprint, parent last
          const sortedTasks = tasks.sort((a, b) => {
            if (a.isParent) return 1;
            if (b.isParent) return -1;
            return (parseInt(a.sprint) || 0) - (parseInt(b.sprint) || 0);
          });

          sortedTasks.forEach((task) => {
            const { sprint, milestone, dueDate } = getSprintAndMilestone(
              task.sprint,
            );
            const assignees = task.assignees
              .map((id) => this.getUserInitials(id))
              .join(", ");
            const taskType = this.taskTypes.find(
              (t) => t.id === task.typeId,
            ).name;

            const parentTask = task.isParent
              ? task.name
              : tasks.find((t) => t.id === task.parentId)?.name || "";

            const row = worksheet.addRow([
              parentTask,
              task.name,
              task.projectId, // Added project column
              taskType,
              task.description,
              task.status,
              dueDate,
              sprint,
              milestone,
              assignees,
              task.comment || "",
              task.id,
              task.isParent ? task.id : task.parentId,
            ]);

            // Apply styles
            if (task.isParent) {
              row.eachCell((cell) => {
                cell.font = styles.parent.font;
                cell.fill = styles.parent.fill;
              });
            } else {
              // Apply status color only to non-parent tasks
              const statusCell = row.getCell(6); // Column index shifted due to new project column
              statusCell.fill = styles[task.status].fill;
            }

            // Set date format for Due Date column
            const dueDateCell = row.getCell(7); // Column index shifted due to new project column
            if (dueDate) {
              dueDateCell.value = dueDate;
              dueDateCell.numFmt = "@"; // Set as text to preserve formatting
            }
          });
        });

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
        "Project,Task Type,Task Name,Description,Status,Assignees,Sprint,Milestone,Due Date,Comment, Parent ID,Task ID\n";
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
                escapeCSV(task.comment || ""),
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
    generateGitHubScript() {
      const orgName = "myorg-rahul";

      let script = `#!/bin/bash\n\n`;
      script += `set -e\n`; // Exit on error
      script += `set -x\n\n`; // Echo commands as they are executed

      script += `# Ensure you're logged in to GitHub CLI and have necessary permissions\n`;
      script += `# Run: gh auth login\n\n`;

      script += `# Function to handle pagination\n`;
      script += `function gh_api_all() {\n`;
      script += `  gh api --paginate "$@"\n`;
      script += `}\n\n`;

      this.columns.forEach((column) => {
        const repoName = column.name.toLowerCase().replace(/\s+/g, "-");
        script += `# Create or update repository for ${column.name}\n`;
        script += `REPO_ID=$(gh api -X PATCH repos/${orgName}/${repoName} -f name="${repoName}" -f description="Repository for ${column.name}" -f private=false --jq '.id')\n`;

        script += `# Create or update project for ${column.name}\n`;
        script += `PROJECT_ID=$(gh api graphql -f query='
                mutation($org: String!, $title: String!) {
                    createProjectV2(input: {ownerId: $org, title: $title}) {
                        projectV2 { id }
                    }
                }' -f org="${orgName}" -f title="${column.name}" --jq '.data.createProjectV2.projectV2.id' || true)\n`;
        script += `if [ -z "$PROJECT_ID" ]; then\n`;
        script += `    PROJECT_ID=$(gh api graphql -f query='
                query($org: String!, $title: String!) {
                    organization(login: $org) {
                        projectsV2(first: 100, query: $title) {
                            nodes {
                                id
                                title
                            }
                        }
                    }
                }' -f org="${orgName}" -f title="${column.name}" --jq '.data.organization.projectsV2.nodes[] | select(.title == "'${column.name}'") | .id')\n`;
        script += `fi\n\n`;

        // Create or update milestones
        const milestones = [
          ...new Set(this.weeks.map((w) => w.milestoneNumber).filter(Boolean)),
        ];
        milestones.forEach((milestone) => {
          script += `# Create or update milestone ${milestone}\n`;
          script += `MILESTONE_ID=$(gh api repos/${orgName}/${repoName}/milestones --jq '.[] | select(.title == "Milestone ${milestone}") | .number')\n`;
          script += `if [ -z "$MILESTONE_ID" ]; then\n`;
          script += `    gh api -X POST repos/${orgName}/${repoName}/milestones -f title="Milestone ${milestone}" -f state="open"\n`;
          script += `else\n`;
          script += `    gh api -X PATCH repos/${orgName}/${repoName}/milestones/$MILESTONE_ID -f state="open"\n`;
          script += `fi\n`;
        });
        script += "\n";

        // Create sprint labels
        const sprints = [
          ...new Set(this.weeks.map((w) => w.sprintNumber).filter(Boolean)),
        ];
        sprints.forEach((sprint) => {
          script += `# Create sprint label ${sprint}\n`;
          script += `gh api -X POST repos/${orgName}/${repoName}/labels -f name="Sprint ${sprint}" -f color="0366d6" || true\n`;
        });
        script += "\n";

        // Create or update issues for each task
        const tasks = this.tasks.filter(
          (task) => task.projectId === column.name,
        );
        tasks.forEach((task) => {
          const { sprint, milestone } = this.getTheSprintAndMilestone(
            task.sprint,
          );
          const assignees = task.assignees.map((id) =>
            this.getUserGitHubUsername(id),
          );
          const escapedDescription = task.description
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n");

          script += `# Create or update issue for task: ${task.name}\n`;
          script += `ISSUE_URL=$(gh api repos/${orgName}/${repoName}/issues -X POST -f title="${task.name}" `;
          script += `-f body="${escapedDescription}" `;
          if (assignees.length > 0)
            script += `-f assignees='${JSON.stringify(assignees)}' `;
          script += `-f labels='["Sprint ${sprint}"]' `;
          if (milestone) {
            script += `-f milestone=$(gh api repos/${orgName}/${repoName}/milestones --jq '.[] | select(.title == "Milestone ${milestone}") | .number') `;
          }
          script += `--jq '.html_url')\n`;

          // Add issue to project
          script += `gh api graphql -f query='
                    mutation($project:ID!, $url:String!) {
                        addProjectV2ItemById(input: {projectId: $project, contentId: $url}) {
                            item { id }
                        }
                    }' -f project="$PROJECT_ID" -f url="$ISSUE_URL" || true\n\n`;
        });

        // Set up project views
        script += `# Set up Kanban board view\n`;
        script += `STATUS_FIELD_ID=$(gh api graphql -f query='
                mutation($project:ID!) {
                    createProjectV2Field(input: {projectId: $project, dataType: SINGLE_SELECT, name: "Status", singleSelectOptions: ["To Do", "Doing", "Done"]}) {
                        projectV2Field { id }
                    }
                }' -f project="$PROJECT_ID" --jq '.data.createProjectV2Field.projectV2Field.id' || true)\n`;

        script += `if [ -z "$STATUS_FIELD_ID" ]; then\n`;
        script += `    STATUS_FIELD_ID=$(gh api graphql -f query='
                query($project:ID!) {
                    node(id: $project) {
                        ... on ProjectV2 {
                            fields(first: 100) {
                                nodes {
                                    ... on ProjectV2Field {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }' -f project="$PROJECT_ID" --jq '.data.node.fields.nodes[] | select(.name == "Status") | .id')\n`;
        script += `fi\n`;

        script += `gh api graphql -f query='
                mutation($project:ID!, $field:ID!) {
                    createProjectV2View(input: {projectId: $project, name: "Kanban", layout: BOARD_LAYOUT, groupByField: $field}) {
                        projectView { id }
                    }
                }' -f project="$PROJECT_ID" -f field="$STATUS_FIELD_ID" || true\n\n`;

        script += `# Set up monthly roadmap view\n`;
        script += `gh api graphql -f query='
                mutation($project:ID!) {
                    createProjectV2Field(input: {projectId: $project, dataType: DATE, name: "Start Date"}) {
                        projectV2Field { id }
                    }
                }' -f project="$PROJECT_ID" || true\n`;
        script += `gh api graphql -f query='
                mutation($project:ID!) {
                    createProjectV2Field(input: {projectId: $project, dataType: DATE, name: "Target Date"}) {
                        projectV2Field { id }
                    }
                }' -f project="$PROJECT_ID" || true\n`;

        script += `SPRINT_FIELD_ID=$(gh api graphql -f query='
                mutation($project:ID!, $options:String!) {
                    createProjectV2Field(input: {projectId: $project, dataType: SINGLE_SELECT, name: "Sprint", singleSelectOptions: $options}) {
                        projectV2Field { id }
                    }
                }' -f project="$PROJECT_ID" -f options='${JSON.stringify(sprints.map((s) => `Sprint ${s}`))}' --jq '.data.createProjectV2Field.projectV2Field.id' || true)\n`;

        script += `if [ -z "$SPRINT_FIELD_ID" ]; then\n`;
        script += `    SPRINT_FIELD_ID=$(gh api graphql -f query='
                query($project:ID!) {
                    node(id: $project) {
                        ... on ProjectV2 {
                            fields(first: 100) {
                                nodes {
                                    ... on ProjectV2Field {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }' -f project="$PROJECT_ID" --jq '.data.node.fields.nodes[] | select(.name == "Sprint") | .id')\n`;
        script += `fi\n`;

        script += `gh api graphql -f query='
                mutation($project:ID!, $field:ID!) {
                    createProjectV2View(input: {projectId: $project, name: "Monthly Roadmap", layout: ROADMAP_LAYOUT, groupByField: $field}) {
                        projectView { id }
                    }
                }' -f project="$PROJECT_ID" -f field="$SPRINT_FIELD_ID" || true\n\n`;

        // Update Sprint field for each issue in the project
        script += `# Update Sprint field for each issue\n`;
        script += `gh_api_all graphql -f query='
                query($project:ID!, $cursor:String) {
                    node(id: $project) {
                        ... on ProjectV2 {
                            items(first: 100, after: $cursor) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                nodes {
                                    id
                                    content {
                                        ... on Issue {
                                            number
                                            labels(first: 10) {
                                                nodes {
                                                    name
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }' -f project="$PROJECT_ID" --paginate | jq -r '.data.node.items.nodes[] | {id: .id, number: .content.number, sprint: (.content.labels.nodes[] | select(.name | startswith("Sprint")).name)} | @base64' | while read -r ITEM; do\n`;
        script += `    ITEM_DATA=$(echo $ITEM | base64 --decode)\n`;
        script += `    ITEM_ID=$(echo $ITEM_DATA | jq -r '.id')\n`;
        script += `    SPRINT_LABEL=$(echo $ITEM_DATA | jq -r '.sprint')\n`;
        script += `    if [ ! -z "$SPRINT_LABEL" ]; then\n`;
        script += `        gh api graphql -f query='
                mutation($project:ID!, $item:ID!, $field:ID!, $value:String!) {
                    updateProjectV2ItemFieldValue(input: {projectId: $project, itemId: $item, fieldId: $field, value: {singleSelectOptionId: $value}}) {
                        projectV2Item { id }
                    }
                }' -f project="$PROJECT_ID" -f item="$ITEM_ID" -f field="$SPRINT_FIELD_ID" -f value="$SPRINT_LABEL" || true\n`;
        script += `    fi\n`;
        script += `done\n\n`;
      });

      return script;
    },

    exportGitHubScript() {
      const script = this.generateGitHubScript();
      const blob = new Blob([script], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "setup_github.sh";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    getUserGitHubUsername(userId) {
      const user = this.users.find((u) => u.id === userId);
      return user ? user.githubUsername : "";
    },

    getTheSprintAndMilestone(sprintNumber) {
      const week = this.weeks.find((w) => w.sprintNumber === sprintNumber);
      if (!week) return { sprint: "Anytime", milestone: "" };
      return {
        sprint: `Sprint ${sprintNumber}`,
        milestone: week.milestoneNumber ? week.milestoneNumber.toString() : "",
      };
    },
  };
}
