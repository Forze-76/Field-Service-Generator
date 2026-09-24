import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeWheelInput from '../TimeWheelInput.jsx';

beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.open = true; }; });

describe('TimeWheelInput', () => {
  it('opens saved time and saves PM wheels as 24-hour time', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimeWheelInput label="Time in" value="08:15" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Time in: 8:15 AM' }));
    await user.click(within(screen.getByRole('listbox', { name: 'AM/PM' })).getByRole('option', { name: 'PM' }));
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Minutes' }), { key: 'ArrowDown' });
    await user.click(screen.getByRole('button', { name: 'Set time' }));
    expect(onChange).toHaveBeenCalledWith('20:16');
  });
  it('keeps travel duration separate from clock time and cancellation preserves data', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimeWheelInput label="Travel time" value="25:30" duration onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Travel time: 25:30' }));
    expect(screen.queryByRole('listbox', { name: 'AM/PM' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Travel time: 25:30' }));
    await user.click(screen.getByRole('button', { name: 'Set time' }));
    expect(onChange).toHaveBeenCalledWith('25:30');
  });
});
