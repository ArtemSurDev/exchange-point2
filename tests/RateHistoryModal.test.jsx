import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import RateHistoryModal from '../src/components/RateHistoryModal.jsx'

describe('RateHistoryModal', () => {
    const history = [
        {
            buy_rate: 90.5,
            sell_rate: 92.1,
            effective_from: '2024-01-01T00:00:00Z'
        },
        {
            buy_rate: 91.2,
            sell_rate: 93.4,
            effective_from: '2024-02-01T00:00:00Z'
        }
    ]

    test('shows disabled state when history is empty', () => {
        render(<RateHistoryModal history={[]} />)

        const button = screen.getByLabelText('История курсов')
        expect(button).toHaveAttribute('title', 'История отсутствует')
    })

    test('opens modal when history exists', async () => {
        const user = userEvent.setup()
        render(<RateHistoryModal history={history} title="История USD" />)

        const button = screen.getByLabelText('История курсов')
        await user.click(button)

        expect(screen.getByText('История USD')).toBeInTheDocument()
        expect(screen.getByText('Закрыть')).toBeInTheDocument()
    })
})

