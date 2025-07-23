import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// PUBLIC_INTERFACE
/**
 * The main App component for the To-Do List application. Handles Supabase connection, state, and all CRUD features.
 * Uses REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY from environment variables for Supabase connection.
 */
function App() {
  // --- SUPABASE SDK DYNAMIC LOADING ---
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    async function loadSupabase() {
      if (!window.createClient) {
        // Dynamically load Supabase JS from CDN if not already loaded
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          setSupabase(
            window.createClient(
              process.env.REACT_APP_SUPABASE_URL,
              process.env.REACT_APP_SUPABASE_KEY
            )
          );
        };
      } else {
        setSupabase(
          window.createClient(
            process.env.REACT_APP_SUPABASE_URL,
            process.env.REACT_APP_SUPABASE_KEY
          )
        );
      }
    }
    loadSupabase();
  }, []);

  // --- STATE ---
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);

  const inputRef = useRef(null);

  // --- COLOR THEME SETUP ---
  useEffect(() => {
    // Override CSS variables with the required color palette
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', '#fff');
    root.style.setProperty('--bg-secondary', '#f8f9fa');
    root.style.setProperty('--button-bg', '#1976d2');
    root.style.setProperty('--button-text', '#fff');
    root.style.setProperty('--accent-color', '#ffb300');
    root.style.setProperty('--secondary-bg', '#424242');
    root.style.setProperty('--border-color', 'rgba(25, 118, 210, 0.12)');
    root.style.setProperty('--text-primary', '#222');
  }, []);

  // --- FETCH TODOS FROM SUPABASE ---
  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    // PUBLIC_INTERFACE
    /**
     * Fetches the todo list from the Supabase database.
     */
    async function fetchTodos() {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('id', { ascending: false });
      if (error) setError('Error loading todos');
      else setTodos(data || []);
      setLoading(false);
    }
    fetchTodos();

    // Listen for changes using Supabase real-time
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        () => fetchTodos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // PUBLIC_INTERFACE
  /**
   * Adds a new todo item to Supabase.
   */
  async function addTodo(e) {
    e.preventDefault();
    if (!input.trim() || !supabase) return;
    setAdding(true);
    setError(null);
    const { error } = await supabase
      .from('todos')
      .insert([{ text: input.trim(), completed: false }]);
    if (error) setError('Failed to add todo');
    setInput('');
    inputRef.current && inputRef.current.focus();
    setAdding(false);
  }

  // PUBLIC_INTERFACE
  /**
   * Deletes a todo by its ID from Supabase.
   */
  async function deleteTodo(id) {
    if (!supabase) return;
    await supabase.from('todos').delete().eq('id', id);
  }

  // PUBLIC_INTERFACE
  /**
   * Sets a todo to edit mode.
   */
  function startEdit(todo) {
    setEditId(todo.id);
    setEditText(todo.text);
  }

  // PUBLIC_INTERFACE
  /**
   * Updates a todo's text in Supabase.
   */
  async function updateTodo(id, text) {
    if (!supabase) return;
    const value = text.trim();
    if (!value) return;
    setError(null);
    const { error } = await supabase.from('todos').update({ text: value }).eq('id', id);
    if (error) setError('Error updating todo');
    setEditId(null);
    setEditText('');
  }

  // PUBLIC_INTERFACE
  /**
   * Sets a todo as complete/incomplete in Supabase.
   */
  async function toggleComplete(todo) {
    if (!supabase) return;
    await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id);
  }

  // UI: Render a single todo
  function renderTodo(todo) {
    const isEditing = editId === todo.id;
    return (
      <li
        key={todo.id}
        className={`todo-item${todo.completed ? ' completed' : ''}`}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          marginBottom: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <input
            type="checkbox"
            checked={!!todo.completed}
            onChange={() => toggleComplete(todo)}
            aria-label="Toggle complete"
            style={{
              accentColor: 'var(--accent-color,#ffb300)',
              marginRight: 14
            }}
          />
          {isEditing ? (
            <form
              style={{ flex: 1, display: 'flex', gap: 6 }}
              onSubmit={e => {
                e.preventDefault();
                updateTodo(todo.id, editText);
              }}>
              <input
                type="text"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="edit-input"
                autoFocus
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: '1px solid #bbb',
                  fontSize: 16,
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--button-bg)',
                  border: 'none',
                  color: 'var(--button-text)',
                  fontWeight: 500,
                  borderRadius: 4,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
                aria-label="Save">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                style={{
                  background: '#eee',
                  border: 'none',
                  color: '#666',
                  borderRadius: 4,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
                aria-label="Cancel">
                Cancel
              </button>
            </form>
          ) : (
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : '',
                color: todo.completed ? '#aaa' : 'inherit',
                fontSize: 17,
                flex: 1,
                wordBreak: 'break-word'
              }}
            >
              {todo.text}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isEditing && (
            <>
              <button
                onClick={() => startEdit(todo)}
                style={{
                  background: 'var(--accent-color)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontWeight: 500,
                  marginRight: 2,
                  cursor: 'pointer'
                }}
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={{
                  background: 'var(--secondary-bg,#424242)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                aria-label="Delete"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </li>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div
        className="todo-container"
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: '40px 12px 24px',
          boxSizing: 'border-box',
        }}
      >
        <h2
          style={{
            color: 'var(--button-bg)',
            fontSize: 32,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 14,
            letterSpacing: '0.03em'
          }}
        >
          To-Do List
        </h2>
        <form
          onSubmit={addTodo}
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 22,
            background: 'var(--bg-secondary)',
            borderRadius: 6,
            padding: '10px 6px'
          }}
          aria-label="Add todo"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a new task..."
            ref={inputRef}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 16,
            }}
            aria-label="Todo text"
            disabled={adding}
            maxLength={128}
            required
          />
          <button
            type="submit"
            style={{
              background: 'var(--button-bg)',
              color: 'var(--button-text)',
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              padding: '0 16px',
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(25,118,210,0.08)',
              minWidth: 80,
              transition: 'background 0.15s'
            }}
            disabled={adding}
            aria-label="Add todo"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div style={{ minHeight: 50 }}>
          {error && (
            <div
              style={{
                background: '#ffcdd2',
                color: '#b71c1c',
                marginBottom: 12,
                borderRadius: 4,
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              {error}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: 60 }}>
            Loading...
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              width: '100%'
            }}
            aria-label="Todo list"
          >
            {todos.length === 0 ? (
              <li
                style={{
                  color: '#aaa',
                  fontStyle: 'italic',
                  marginTop: 18,
                  textAlign: 'center'
                }}>
                No tasks. Enjoy your day! 🎉
              </li>
            ) : (
              todos.map(renderTodo)
            )}
          </ul>
        )}
        <footer
          style={{
            marginTop: 34,
            color: '#aaa',
            fontSize: 12,
            textAlign: 'center'
          }}>
          Built with <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>Supabase</span> and <span style={{ color: 'var(--button-bg)', fontWeight: 700 }}>React</span>
        </footer>
      </div>
      {/* Minimal CSS for responsiveness */}
      <style>{`
        @media (max-width: 600px) {
          .todo-container {
            max-width: 97vw !important;
            padding: 14px 1vw 18px !important;
          }
          h2 {
            font-size: 24px !important;
          }
        }
        .todo-item.completed span {
          text-decoration: line-through;
          opacity: 0.7;
        }
        .todo-item .edit-input:focus {
          outline: 2px solid var(--accent-color);
        }
        button[disabled], button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default App;
