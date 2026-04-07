/**
 * @name ToDoList
 * @version 1.0
 * @description ToDoList lets you create, manage, and track tasks with priorities, due dates, notes, and a clean inbox.
 * @author DevEvil
 * @website https://devevil.com
 * @invite jsQ9UP7kCA
 * @authorId 468132563714703390
 * @donate https://devevil.com/dnt
 * @source https://github.com/DevEvil99/ToDoList-BetterDiscord-Plugin
 * @updateUrl https://raw.githubusercontent.com/DevEvil99/ToDoList-BetterDiscord-Plugin/main/ToDoList.plugin.js
 */

const config = {
    info: {
        name: "ToDoList",
        version: "1.0",
        description: "ToDoList lets you create, manage, and track tasks with priorities, due dates, notes, and a clean inbox.",
        authors: [{
            name: "DevEvil",
            discord_id: "468132563714703390",
            github_username: "DevEvil99"
        }],
        website: "https://devevil.com",
        github: "https://github.com/DevEvil99/ToDoList-BetterDiscord-Plugin",
        github_raw: "https://raw.githubusercontent.com/DevEvil99/ToDoList-BetterDiscord-Plugin/main/ToDoList.plugin.js",
        invite: "jsQ9UP7kCA",
    }
};

const {
    Components,
    ContextMenu,
    Commands,
    Data,
    DOM,
    Logger,
    Net,
    Patcher,
    Plugins,
    ReactUtils,
    Themes,
    UI,
    Utils,
    Webpack,
    React
} = new BdApi();

class ToDoList {
    constructor() {
        this.defaultSettings = {
            sortBy: "dueDate",
            enableShortcuts: true,
            todoCreationShortcut: ["Alt", "T"],
            todoInboxShortcut: ["Alt", "I"],
            hideCompletedByDefault: false
        };
        this.settings = this.loadSettings();
        this.todos = this.loadTodos();
        this.keybindHandler = null;
    }

    loadSettings() {
        const saved = Data.load("ToDoList", "settings") || {};
        return Object.assign({}, this.defaultSettings, saved);
    }

    saveSettings() {
        Data.save("ToDoList", "settings", this.settings);
    }

    loadTodos() {
        const data = Data.load("ToDoList", "todos");
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse todos data:", e);
            }
        }
        return [];
    }

    saveTodos() {
        Data.save("ToDoList", "todos", JSON.stringify(this.todos));
    }

    start() {
        if (!Data.load("ToDoList", "settings")) {
            this.saveSettings();
        }
        this.todos = this.loadTodos();
        this.addToDoListButton();
        this.refreshKeybinds();
        this.showChangelogIfNeeded();
    }

    stop() {
        Patcher.unpatchAll("ToDoList");
        if (this.guildsNavObserver) {
            this.guildsNavObserver.disconnect();
            this.guildsNavObserver = null;
            document.querySelector(".ToDoListBtn")?.parentElement?.remove();
        }
        if (this.keybindHandler) {
            document.removeEventListener("keydown", this.keybindHandler);
            this.keybindHandler = null;
        }
    }

    refreshKeybinds() {
        if (this.keybindHandler) {
            document.removeEventListener("keydown", this.keybindHandler);
            this.keybindHandler = null;
        }

        if (!this.settings.enableShortcuts) return;

        this.keybindHandler = (e) => {
            const checkKeybind = (keybind) => {
                if (!Array.isArray(keybind) || keybind.length === 0) return false;

                const keys = keybind.map(k => k.toLowerCase());

                const hasShift = keys.includes("shift");
                const hasCtrl = keys.includes("control") || keys.includes("ctrl");
                const hasAlt = keys.includes("alt");
                const hasMeta = keys.includes("meta") || keys.includes("cmd") || keys.includes("command");

                const mainKey = keys.find(k => !["shift", "control", "ctrl", "alt", "meta", "cmd", "command"].includes(k));
                if (!mainKey) return false;

                return (!hasShift || e.shiftKey) &&
                    (!hasCtrl || e.ctrlKey) &&
                    (!hasAlt || e.altKey) &&
                    (!hasMeta || e.metaKey) &&
                    e.key.toLowerCase() === mainKey;
            };

            if (checkKeybind(this.settings.todoCreationShortcut)) {
                e.preventDefault();
                this.openToDoListModal();
            } else if (checkKeybind(this.settings.todoInboxShortcut)) {
                e.preventDefault();
                this.showToDoInbox();
            }
        };

        document.addEventListener("keydown", this.keybindHandler);
    }

    addToDoListButton() {
        if (this.guildsNavObserver) {
            this.guildsNavObserver.disconnect();
        }

        const observer = new MutationObserver(() => {
            const guildsNav = document.querySelector(`.${Webpack.getByKeys('unreadMentionsIndicatorBottom').itemsContainer}`);
            if (!guildsNav || guildsNav.querySelector('.ToDoListBtn')) return;

            const listItem = document.createElement("div");
            listItem.className = Webpack.getByKeys('tutorialContainer').listItem;

            const listItemWrapper = document.createElement("div");
            listItemWrapper.className = `${Webpack.getByKeys('listItemWrapper').listItemWrapper} todoWrapper`;

            listItemWrapper.style.display = 'flex';
            listItemWrapper.style.justifyContent = 'center';

            const wrapper = document.createElement("div");
            wrapper.className = `${Webpack.getByKeys('lowerBadge').wrapper} ToDoListBtn`;

            wrapper.innerHTML = `
            <svg width="48" height="48" viewBox="-4 -4 48 48" overflow="visible" style="cursor: pointer;">
                <defs>
                    <path d="M0 17.4545C0 11.3449 0 8.29005 1.18902 5.95647C2.23491 3.90379 3.90379 2.23491 5.95647 1.18902C8.29005 0 11.3449 0 17.4545 0H22.5455C28.6551 0 31.71 0 34.0435 1.18902C36.0962 2.23491 37.7651 3.90379 38.811 5.95647C40 8.29005 40 11.3449 40 17.4545V22.5455C40 28.6551 40 31.71 38.811 34.0435C37.7651 36.0962 36.0962 37.7651 34.0435 38.811C31.71 40 28.6551 40 22.5455 40H17.4545C11.3449 40 8.29005 40 5.95647 38.811C3.90379 37.7651 2.23491 36.0962 1.18902 34.0435C0 31.71 0 28.6551 0 22.5455V17.4545Z" id="todo-blob-mask"></path>
                </defs>
                <mask id="todo-mask" fill="black" x="0" y="0" width="40" height="40">
                    <use href="#todo-blob-mask" fill="white" />
                </mask>
                <foreignObject mask="url(#todo-mask)" x="0" y="0" width="40" height="40">
                    <div class="${Webpack.getByKeys('circleIcon').circleIconButton} todoBtnIcon" aria-label="ToDoList" role="treeitem" tabindex="-1">
                        <svg class="${Webpack.getByKeys('circleIcon').circleIcon}" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"
                            width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm4.996 2a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM11 8a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-6Zm-4.004 3a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM11 11a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-6Zm-4.004 3a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM11 14a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-6Z"/>
                        </svg>
                    </div>
                </foreignObject>
            </svg>
            `;

            wrapper.onclick = () => this.openToDoListModal();

            listItem.appendChild(listItemWrapper);
            listItemWrapper.appendChild(wrapper);
            UI.createTooltip(wrapper, "To-Do List", {
                style: "primary",
                side: "right"
            });

            const separator = guildsNav.querySelector('[aria-label="Servers"]');
            if (separator?.parentElement) {
                separator.parentElement.insertBefore(listItemWrapper, separator);
            } else {
                guildsNav.appendChild(listItemWrapper);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.guildsNavObserver = observer;
    }

    openToDoListModal() {
        const {
            React
        } = BdApi;

        const todoForm = {
            current: {
                text: "",
                due: "",
                priority: "low",
                notes: ""
            }
        };

        const ModalContent = () => {
            const [text, setText] = React.useState("");
            const [due, setDue] = React.useState("");
            const [priority, setPriority] = React.useState("low");
            const [notes, setNotes] = React.useState("");

            React.useEffect(() => {
                todoForm.current = {
                    text,
                    due,
                    priority,
                    notes
                };
            }, [text, due, priority, notes]);

            return React.createElement("div", {
                    style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: "15px",
                        padding: "5px"
                    }
                },
                React.createElement("div", null,
                    React.createElement("h4", {
                        style: {
                            color: "var(--text-default)",
                            marginBottom: "5px"
                        }
                    }, "Task"),
                    React.createElement("input", {
                        value: text,
                        onChange: e => setText(e.target.value),
                        placeholder: "What needs to be done?",
                        style: {
                            background: "var(--background-base-lowest)",
                            outline: "none",
                            border: "none",
                            padding: "10px",
                            borderRadius: "10px",
                            width: "100%",
                            color: "var(--text-default)"
                        }
                    })
                ),
                React.createElement("div", null,
                    React.createElement("h4", {
                        style: {
                            color: "var(--text-default)",
                            marginBottom: "5px"
                        }
                    }, "Due Date (Optional)"),
                    React.createElement("input", {
                        type: "datetime-local",
                        value: due,
                        onChange: e => setDue(e.target.value),
                        style: {
                            background: "var(--background-base-lowest)",
                            outline: "none",
                            border: "none",
                            padding: "10px",
                            borderRadius: "10px",
                            width: "100%",
                            color: "var(--text-default)"
                        }
                    })
                ),
                React.createElement("div", null,
                    React.createElement("h4", {
                        style: {
                            color: "var(--text-default)",
                            marginBottom: "5px"
                        }
                    }, "Notes (Optional)"),
                    React.createElement("textarea", {
                        value: notes,
                        onChange: e => setNotes(e.target.value),
                        placeholder: "Any extra details...",
                        style: {
                            background: "var(--background-base-lowest)",
                            outline: "none",
                            border: "none",
                            padding: "10px",
                            borderRadius: "10px",
                            width: "100%",
                            height: "80px",
                            color: "var(--text-default)",
                            resize: "vertical"
                        }
                    })
                ),
                React.createElement("div", null,
                    React.createElement("h4", {
                        style: {
                            color: "var(--text-default)",
                            marginBottom: "5px"
                        }
                    }, "Priority"),
                    React.createElement("select", {
                            value: priority,
                            onChange: e => setPriority(e.target.value),
                            style: {
                                background: "var(--background-base-lowest)",
                                outline: "none",
                                border: "none",
                                padding: "10px",
                                borderRadius: "10px",
                                width: "100%",
                                color: "var(--text-default)"
                            }
                        },
                        React.createElement("option", {
                            value: "low"
                        }, "Low"),
                        React.createElement("option", {
                            value: "medium"
                        }, "Medium"),
                        React.createElement("option", {
                            value: "high"
                        }, "High")
                    )
                ),
                React.createElement("button", {
                        style: {
                            background: "var(--background-base-lowest)",
                            border: "none",
                            padding: "10px",
                            borderRadius: "10px",
                            color: "var(--text-default)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            width: "fit-content",
                            gap: "8px"
                        },
                        onClick: () => this.showToDoInbox()
                    },
                    React.createElement("svg", {
                            width: "16",
                            height: "16",
                            fill: "currentColor",
                            viewBox: "0 0 24 24"
                        },
                        React.createElement("path", {
                            d: "M5.024 3.783A1 1 0 0 1 6 3h12a1 1 0 0 1 .976.783L20.802 12h-4.244a1.99 1.99 0 0 0-1.824 1.205 2.978 2.978 0 0 1-5.468 0A1.991 1.991 0 0 0 7.442 12H3.198l1.826-8.217ZM3 14v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-4.43a4.978 4.978 0 0 1-9.14 0H3Z"
                        })
                    ),
                    "View All To-Dos"
                )
            );
        };

        UI.showConfirmationModal(
            "New To-Do",
            React.createElement(ModalContent), {
                confirmText: "Add To-Do",
                onConfirm: () => {
                    const {
                        text,
                        due,
                        priority,
                        notes
                    } = todoForm.current;

                    if (!text.trim()) {
                        UI.showToast("Task text is required!", {
                            type: "error"
                        });
                        return;
                    }

                    const dueDate = due ? new Date(due).getTime() : null;

                    this.todos.unshift({
                        id: Date.now(),
                        text: text.trim(),
                        completed: false,
                        dueDate,
                        priority,
                        notes: notes.trim(),
                        createdAt: Date.now()
                    });

                    this.saveTodos();
                    UI.showToast("To-do created!", {
                        type: "success"
                    });
                }
            }
        );
    }

    showToDoInbox() {
        const {
            React
        } = BdApi;

        const TodoInbox = () => {
            const [localTodos, setLocalTodos] = React.useState([...this.todos]);
            const [filter, setFilter] = React.useState(this.settings.hideCompletedByDefault ? "active" : "all");
            const [search, setSearch] = React.useState("");
            const [sortBy, setSortBy] = React.useState(this.settings.sortBy);

            const filteredTodos = localTodos
                .filter(todo => {
                    const matchesSearch = todo.text.toLowerCase().includes(search.toLowerCase()) ||
                        (todo.notes && todo.notes.toLowerCase().includes(search.toLowerCase()));
                    if (filter === "active") return !todo.completed && matchesSearch;
                    if (filter === "completed") return todo.completed && matchesSearch;
                    return matchesSearch;
                })
                .sort((a, b) => {
                    if (sortBy === "dueDate") return (!a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate - b.dueDate);
                    if (sortBy === "priority") {
                        const order = {
                            high: 3,
                            medium: 2,
                            low: 1
                        };
                        return order[b.priority] - order[a.priority];
                    }
                    return b.createdAt - a.createdAt;
                });

            const update = (newTodos) => {
                this.todos = [...newTodos];
                this.saveTodos();
                setLocalTodos([...newTodos]);
            };

            const toggleComplete = (id) => update(localTodos.map(t => t.id === id ? {
                ...t,
                completed: !t.completed
            } : t));

            const deleteTodo = (id) => {
                UI.showConfirmationModal("Delete To-Do", "Are you sure?", {
                    confirmText: "Delete",
                    danger: true,
                    onConfirm: () => {
                        update(localTodos.filter(t => t.id !== id));
                        UI.showToast("To-Do Deleted", {
                            type: "success"
                        });
                    }
                });
            };

            const openEdit = (todo) => {
                if (todo.completed) return;

                const editForm = {
                    current: {
                        text: todo.text,
                        due: todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : "",
                        priority: todo.priority,
                        notes: todo.notes || ""
                    }
                };

                const EditContent = () => {
                    const [text, setText] = React.useState(todo.text);
                    const [due, setDue] = React.useState(editForm.current.due);
                    const [priority, setPriority] = React.useState(todo.priority);
                    const [notes, setNotes] = React.useState(todo.notes || "");

                    React.useEffect(() => {
                        editForm.current = {
                            text,
                            due,
                            priority,
                            notes
                        };
                    }, [text, due, priority, notes]);

                    return React.createElement("div", {
                            style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "15px",
                                padding: "5px"
                            }
                        },
                        React.createElement("h4", {
                            style: {
                                color: "var(--text-default)"
                            }
                        }, "Task"),
                        React.createElement("input", {
                            value: text,
                            onChange: e => setText(e.target.value),
                            style: {
                                background: "var(--background-base-lowest)",
                                outline: "none",
                                border: "none",
                                padding: "10px",
                                borderRadius: "10px",
                                width: "100%",
                                color: "var(--text-default)"
                            }
                        }),
                        React.createElement("h4", {
                            style: {
                                color: "var(--text-default)"
                            }
                        }, "Due Date"),
                        React.createElement("input", {
                            type: "datetime-local",
                            value: due,
                            onChange: e => setDue(e.target.value),
                            style: {
                                background: "var(--background-base-lowest)",
                                outline: "none",
                                border: "none",
                                padding: "10px",
                                borderRadius: "10px",
                                width: "100%",
                                color: "var(--text-default)"
                            }
                        }),
                        React.createElement("h4", {
                            style: {
                                color: "var(--text-default)"
                            }
                        }, "Notes"),
                        React.createElement("textarea", {
                            value: notes,
                            onChange: e => setNotes(e.target.value),
                            style: {
                                background: "var(--background-base-lowest)",
                                outline: "none",
                                border: "none",
                                padding: "10px",
                                borderRadius: "10px",
                                width: "100%",
                                height: "80px",
                                color: "var(--text-default)",
                                resize: "vertical"
                            }
                        }),
                        React.createElement("h4", {
                            style: {
                                color: "var(--text-default)"
                            }
                        }, "Priority"),
                        React.createElement("select", {
                                value: priority,
                                onChange: e => setPriority(e.target.value),
                                style: {
                                    background: "var(--background-base-lowest)",
                                    outline: "none",
                                    border: "none",
                                    padding: "10px",
                                    borderRadius: "10px",
                                    width: "100%",
                                    color: "var(--text-default)"
                                }
                            },
                            React.createElement("option", {
                                value: "low"
                            }, "Low"),
                            React.createElement("option", {
                                value: "medium"
                            }, "Medium"),
                            React.createElement("option", {
                                value: "high"
                            }, "High")
                        )
                    );
                };

                UI.showConfirmationModal("Edit To-Do", React.createElement(EditContent), {
                    confirmText: "Save Changes",
                    onConfirm: () => {
                        const {
                            text,
                            due,
                            priority,
                            notes
                        } = editForm.current;
                        if (!text.trim()) return;

                        const newTodos = localTodos.map(t => t.id === todo.id ? {
                            ...t,
                            text: text.trim(),
                            dueDate: due ? new Date(due).getTime() : null,
                            priority,
                            notes: notes.trim()
                        } : t);

                        update(newTodos);
                        UI.showToast("To-Do Updated!", {
                            type: "success"
                        });
                    }
                });
            };

            return React.createElement("div", {
                    style: {
                        padding: "5px",
                        maxHeight: "550px"
                    }
                },
                React.createElement("div", {
                        style: {
                            display: "flex",
                            gap: "10px",
                            marginBottom: "15px",
                            flexWrap: "wrap"
                        }
                    },
                    React.createElement("input", {
                        type: "text",
                        placeholder: "Search tasks...",
                        value: search,
                        onChange: e => setSearch(e.target.value),
                        style: {
                            flex: 1,
                            padding: "8px",
                            borderRadius: "8px",
                            background: "var(--background-base-lowest)",
                            border: "none",
                            color: "var(--text-default)"
                        }
                    }),
                    React.createElement("button", {
                        onClick: () => setFilter("all"),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: filter === "all" ? "var(--bd-brand)" : "var(--background-base-lower)",
                            color: "var(--text-default)",
                            border: "none"
                        }
                    }, "All"),
                    React.createElement("button", {
                        onClick: () => setFilter("active"),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: filter === "active" ? "var(--bd-brand)" : "var(--background-base-lower)",
                            color: "var(--text-default)",
                            border: "none"
                        }
                    }, "Active"),
                    React.createElement("button", {
                        onClick: () => setFilter("completed"),
                        style: {
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: filter === "completed" ? "var(--bd-brand)" : "var(--background-base-lower)",
                            color: "var(--text-default)",
                            border: "none"
                        }
                    }, "Completed")
                ),

                React.createElement("div", {
                        style: {
                            marginBottom: "10px"
                        }
                    },
                    React.createElement("select", {
                            value: sortBy,
                            onChange: e => {
                                this.settings.sortBy = e.target.value;
                                this.saveSettings();
                                setSortBy(e.target.value);
                            },
                            style: {
                                padding: "6px",
                                borderRadius: "6px",
                                border: "none",
                                background: "var(--background-base-lowest)",
                                color: "var(--text-default)"
                            }
                        },
                        React.createElement("option", {
                            value: "dueDate"
                        }, "Sort by Due Date"),
                        React.createElement("option", {
                            value: "priority"
                        }, "Sort by Priority"),
                        React.createElement("option", {
                            value: "created"
                        }, "Sort by Newest")
                    )
                ),

                filteredTodos.length === 0 ?
                React.createElement("div", {
                        style: {
                            textAlign: "center",
                            color: "var(--text-muted)",
                            padding: "40px 20px"
                        }
                    },
                    React.createElement("p", null, "No to-dos found. Create one!")
                ) :
                filteredTodos.map(todo => {
                    const isOverdue = todo.dueDate && todo.dueDate < Date.now() && !todo.completed;
                    const priorityColor = todo.priority === "high" ? "#f23f42" : todo.priority === "medium" ? "#f0b132" : "#3ba55c";

                    return React.createElement("div", {
                            key: todo.id,
                            style: {
                                display: "flex",
                                alignItems: "center",
                                padding: "12px",
                                marginBottom: "8px",
                                background: "var(--background-base-lower)",
                                borderRadius: "8px",
                                gap: "12px",
                                opacity: todo.completed ? 0.7 : 1
                            }
                        },
                        React.createElement("div", {
                                onClick: () => toggleComplete(todo.id),
                                style: {
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "4px",
                                    border: `2px solid ${todo.completed ? "#3ba55c" : "var(--text-muted)"}`,
                                    backgroundColor: todo.completed ? "#3ba55c" : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    transition: "all 0.1s ease"
                                }
                            },
                            todo.completed && React.createElement("svg", {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "white"
                                },
                                React.createElement("path", {
                                    d: "M20.285 6.709a1 1 0 0 0-1.414-1.414l-9.928 9.929-3.535-3.535a1 1 0 1 0-1.414 1.414l4.243 4.243a1 1 0 0 0 1.414 0l10.634-10.637Z"
                                })
                            )
                        ),

                        React.createElement("div", {
                                style: {
                                    flex: 1,
                                    minWidth: 0
                                }
                            },
                            React.createElement("div", {
                                style: {
                                    fontSize: "15px",
                                    fontWeight: "500",
                                    textDecoration: todo.completed ? "line-through" : "none",
                                    color: isOverdue ? "#f23f42" : "var(--text-default)"
                                }
                            }, todo.text),

                            todo.dueDate && React.createElement("div", {
                                style: {
                                    fontSize: "12px",
                                    color: isOverdue ? "#f23f42" : "var(--text-muted)"
                                }
                            }, new Date(todo.dueDate).toLocaleString()),

                            todo.notes && React.createElement("div", {
                                style: {
                                    fontSize: "12px",
                                    color: "var(--text-muted)",
                                    marginTop: "4px",
                                    fontStyle: "italic"
                                }
                            }, todo.notes),

                            React.createElement("div", {
                                style: {
                                    display: "inline-block",
                                    fontSize: "10px",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background: priorityColor + "22",
                                    color: priorityColor,
                                    fontWeight: "700",
                                    marginTop: "4px"
                                }
                            }, todo.priority.toUpperCase())
                        ),

                        React.createElement("div", {
                                style: {
                                    display: "flex",
                                    gap: "8px"
                                }
                            },
                            !todo.completed && React.createElement("button", {
                                    onClick: () => openEdit(todo),
                                    style: {
                                        padding: "8px",
                                        border: "none",
                                        background: "var(--background-base-lowest)",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        color: "var(--text-default)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    },
                                    title: "Edit"
                                },
                                React.createElement("svg", {
                                        width: "18",
                                        height: "18",
                                        viewBox: "0 0 24 24",
                                        fill: "currentColor"
                                    },
                                    React.createElement("path", {
                                        d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                                    })
                                )
                            ),

                            React.createElement("button", {
                                    onClick: () => deleteTodo(todo.id),
                                    style: {
                                        padding: "8px",
                                        border: "none",
                                        background: "#f23f42",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        color: "var(--text-default)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    },
                                    title: "Delete"
                                },
                                React.createElement("svg", {
                                        width: "18",
                                        height: "18",
                                        viewBox: "0 0 24 24",
                                        fill: "currentColor"
                                    },
                                    React.createElement("path", {
                                        d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                    })
                                )
                            )
                        )
                    );
                })
            );
        };

        UI.showConfirmationModal(
            `To-Do Inbox (${this.todos.length} total)`,
            React.createElement(TodoInbox), {
                confirmText: "Close",
                cancelText: null
            }
        );
    }

    showChangelogIfNeeded() {
        const lastVersion = Data.load("ToDoList", "lastVersion");
        if (lastVersion !== config.info.version) {
            this.showChangelog();
            Data.save("ToDoList", "lastVersion", config.info.version);
        }
    }

    showChangelog() {
        const changes = [{
            title: "Version 1.0",
            type: "added",
            items: [
                "Hello World! Thank you for using ToDoList 🫂",
                "💡 If you find any **bugs** or have **suggestions**, please report them on my **[Discord server](https://discord.com/invite/jsQ9UP7kCA)**. 💡"
            ]
        }];

        UI.showChangelogModal({
            title: "ToDoList",
            subtitle: "By DevEvil",
            changes: changes
        });
    }

    getSettingsPanel() {
        return UI.buildSettingsPanel({
            settings: [{
                    type: "category",
                    id: "shortcut_options",
                    name: "Keyboard Shortcuts",
                    collapsible: true,
                    shown: true,
                    settings: [{
                            type: "switch",
                            id: "enableShortcuts",
                            name: "Enable Shortcuts",
                            note: "Enable or disable all keyboard shortcuts.",
                            value: this.settings.enableShortcuts,
                            onChange: (value) => {
                                this.settings.enableShortcuts = value;
                                this.saveSettings();
                                this.refreshKeybinds();
                                UI.showToast(`Shortcuts ${value ? "enabled" : "disabled"}`, {
                                    type: "success"
                                });
                            }
                        },
                        {
                            type: "keybind",
                            id: "todoCreationShortcut",
                            name: "New To-Do Shortcut",
                            note: "Set your preferred shortcut to open the to-do creation modal (default: Alt + T)",
                            value: this.settings.todoCreationShortcut,
                            onChange: (value) => {
                                this.settings.todoCreationShortcut = value;
                                this.saveSettings();
                                this.refreshKeybinds();
                            }
                        },
                        {
                            type: "keybind",
                            id: "todoInboxShortcut",
                            name: "Inbox Shortcut",
                            note: "Set your preferred shortcut to open the to-do inbox modal (default: Alt + I)",
                            value: this.settings.todoInboxShortcut,
                            onChange: (value) => {
                                this.settings.todoInboxShortcut = value;
                                this.saveSettings();
                                this.refreshKeybinds();
                            }
                        }
                    ]
                },
                {
                    type: "category",
                    id: "ui_options",
                    name: "UI Settings",
                    collapsible: true,
                    shown: false,
                    settings: [{
                        type: "switch",
                        id: "hideCompletedByDefault",
                        name: "Hide Completed Tasks by Default",
                        note: "When opening inbox, only show active tasks.",
                        value: this.settings.hideCompletedByDefault,
                        onChange: (value) => {
                            this.settings.hideCompletedByDefault = value;
                            this.saveSettings();
                            UI.showToast(`Completed tasks will ${value ? "be hidden" : "be shown"} by default`, {
                                type: "success"
                            });
                        }
                    }]
                }
            ]
        });
    }
}

module.exports = class extends ToDoList {
    constructor() {
        super();
    }
};
