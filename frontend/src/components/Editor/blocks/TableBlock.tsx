import React, { useState, useEffect } from 'react';
import { Block, TableBlockContent } from '../../../types';
import './TableBlock.css';

interface TableBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: TableBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const TableBlock: React.FC<TableBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [rows, setRows] = useState(block.content?.rows || [['', '']]);
  const [headers, setHeaders] = useState(block.content?.headers || ['Column 1', 'Column 2']);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    setRows(block.content?.rows || [['', '']]);
    setHeaders(block.content?.headers || ['Column 1', 'Column 2']);
  }, [block.content?.rows, block.content?.headers]);

  useEffect(() => {
    onEditingChange(editingCell !== null);
  }, [editingCell, onEditingChange]);

  const updateTable = (newRows: string[][], newHeaders: string[]) => {
    setRows(newRows);
    setHeaders(newHeaders);
    onUpdate({ rows: newRows, headers: newHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    updateTable(newRows, headers);
  };

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    updateTable(rows, newHeaders);
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill('');
    updateTable([...rows, newRow], headers);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length > 1) {
      const newRows = rows.filter((_: string[], index: number) => index !== rowIndex);
      updateTable(newRows, headers);
    }
  };

  const addColumn = () => {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newRows = rows.map((row: string[]) => [...row, '']);
    updateTable(newRows, newHeaders);
  };

  const removeColumn = (colIndex: number) => {
    if (headers.length > 1) {
      const newHeaders = headers.filter((_: string, index: number) => index !== colIndex);
      const newRows = rows.map((row: string[]) => row.filter((_: string, index: number) => index !== colIndex));
      updateTable(newRows, newHeaders);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ row: rowIndex, col: colIndex });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = colIndex + 1;
      const nextRow = rowIndex;
      
      if (nextCol < headers.length) {
        setEditingCell({ row: nextRow, col: nextCol });
      } else if (nextRow + 1 < rows.length) {
        setEditingCell({ row: nextRow + 1, col: 0 });
      } else {
        setEditingCell(null);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="table-block">
      {isSelected && (
        <div className="table-toolbar">
          <button onClick={addRow} className="table-btn" title="Add row">
            ➕ Row
          </button>
          <button onClick={addColumn} className="table-btn" title="Add column">
            ➕ Column
          </button>
        </div>
      )}

      <div className="table-container">
        <table className="block-table">
          <thead>
            <tr>
              {headers.map((header: string, colIndex: number) => (
                <th key={colIndex} className="table-header">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                    className="header-input"
                    placeholder={`Column ${colIndex + 1}`}
                  />
                  {isSelected && headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIndex)}
                      className="remove-column-btn"
                      title="Remove column"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: string[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell: string, colIndex: number) => (
                  <td key={colIndex} className="table-cell">
                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                      <textarea
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        className="cell-textarea"
                        autoFocus
                        rows={1}
                      />
                    ) : (
                      <div
                        className="cell-content"
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        {cell || (
                          <span className="cell-placeholder">
                            Click to edit
                          </span>
                        )}
                      </div>
                    )}
                    
                    {isSelected && colIndex === row.length - 1 && rows.length > 1 && (
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="remove-row-btn"
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};