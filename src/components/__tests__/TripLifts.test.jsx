import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import TripLifts from '../TripLifts';
it('adds a batch of inspections and rejects duplicate serial numbers', async () => {
  const onAdd=vi.fn(); const user=userEvent.setup(); const selected={id:'a',jobNo:'J#21460',model:'M',documents:[],tripType:'Start Up'};
  render(<TripLifts selected={selected} lifts={[selected]} types={['Start Up','Inspection']} onAdd={onAdd} />);
  await user.click(screen.getByText('+ Add lifts'));
  await user.selectOptions(screen.getByLabelText('Work type'),'Inspection');
  await user.type(screen.getByLabelText('Job / serial numbers'),'21460');
  await user.click(screen.getByRole('button',{name:'Add lifts',exact:true}));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  await user.clear(screen.getByLabelText('Job / serial numbers'));
  await user.type(screen.getByLabelText('Job / serial numbers'),'21461, 21462');
  await user.click(screen.getByRole('button',{name:'Add lifts',exact:true}));
  expect(onAdd).toHaveBeenCalledWith([{jobNo:'21461',model:'M',tripType:'Inspection'},{jobNo:'21462',model:'M',tripType:'Inspection'}]);
});
