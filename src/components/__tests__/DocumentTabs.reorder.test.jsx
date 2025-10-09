import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import DocumentTabs from '../../components/DocumentTabs.jsx';

describe('DocumentTabs reorder', () => {
  const makeDocs = () => ([
    { id: 'a', name: 'Field Service Report', done: false },
    { id: 'b', name: 'Service Summary', done: false },
    { id: 'c', name: 'Startup Checklist', done: false },
  ]);

  it('reorders with keyboard Alt+ArrowRight and calls onReorder', async () => {
    const user = userEvent.setup();
    const onReorder = vi.fn();
    const onSelect = vi.fn();
    const docs = makeDocs();
    render(
      <DocumentTabs documents={docs} activeId={'a'} onSelect={onSelect} onReorder={onReorder} />
    );

    const first = screen.getByRole('tab', { name: /Field Service Report/i });
    first.focus();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');

    expect(onReorder).toHaveBeenCalled();
    const next = onReorder.mock.calls.pop()[0];
    expect(next.map(d => d.id).join('|')).toBe('b|a|c');
  });
});

