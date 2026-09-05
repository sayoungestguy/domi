import { render, screen } from '@testing-library/react-native';

import { Button } from './ui';

describe('Button', () => {
  it('gives its loading progress indicator an accessible name', async () => {
    await render(<Button label="Save household" loading onPress={() => undefined} />);

    expect(screen.getByLabelText('Save household in progress')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });
});
