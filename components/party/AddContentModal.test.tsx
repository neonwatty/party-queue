import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddContentModal } from './AddContentModal'

// Mock icons as simple spans
vi.mock('@/components/icons', () => ({
  CloseIcon: () => <span data-testid="close-icon" />,
  LinkIcon: () => <span data-testid="link-icon" />,
  YoutubeIcon: ({ size }: { size?: number }) => <span data-testid="youtube-icon" data-size={size} />,
  TwitterIcon: ({ size }: { size?: number }) => <span data-testid="twitter-icon" data-size={size} />,
  RedditIcon: ({ size }: { size?: number }) => <span data-testid="reddit-icon" data-size={size} />,
  NoteIcon: ({ size }: { size?: number }) => <span data-testid="note-icon" data-size={size} />,
  ImageIcon: ({ size }: { size?: number }) => <span data-testid="image-icon" data-size={size} />,
  LoaderIcon: () => <span data-testid="loader-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  CalendarIcon: ({ size }: { size?: number }) => <span data-testid="calendar-icon" data-size={size} />,
}))

// Mock useFocusTrap to no-op
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

// Default props factory
function defaultProps(overrides: Partial<React.ComponentProps<typeof AddContentModal>> = {}) {
  return {
    isOpen: true,
    step: 'input' as const,
    contentUrl: '',
    noteText: '',
    noteDueDate: '',
    detectedType: null,
    fetchedPreview: null,
    fetchError: null,
    imagePreviewUrl: null,
    imageCaption: '',
    imageValidationError: null,
    selectedImageFile: null,
    pendingItemsCount: 0,
    onClose: vi.fn(),
    onContentUrlChange: vi.fn(),
    onNoteTextChange: vi.fn(),
    onNoteDueDateChange: vi.fn(),
    onImageCaptionChange: vi.fn(),
    onUrlSubmit: vi.fn(),
    onNoteSubmit: vi.fn(),
    onAddToQueue: vi.fn(),
    onImageUpload: vi.fn(),
    onImageCancel: vi.fn(),
    onFileSelect: vi.fn(),
    onGoToNoteStep: vi.fn(),
    onResetToInput: vi.fn(),
    ...overrides,
  }
}

describe('AddContentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Modal renders when isOpen=true
  it('renders when isOpen is true', () => {
    render(<AddContentModal {...defaultProps()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // 2. Modal does not render when isOpen=false
  it('does not render when isOpen is false', () => {
    render(<AddContentModal {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // 3. Shows URL input on initial step
  it('shows URL input on the input step', () => {
    render(<AddContentModal {...defaultProps()} />)
    expect(screen.getByPlaceholderText('YouTube, Twitter/X, or Reddit URL...')).toBeInTheDocument()
    expect(screen.getByText('Add to queue')).toBeInTheDocument()
  })

  // 4. Detects YouTube URL — typing triggers onContentUrlChange
  it('calls onContentUrlChange when typing a YouTube URL', async () => {
    const onContentUrlChange = vi.fn()
    render(<AddContentModal {...defaultProps({ onContentUrlChange })} />)

    const input = screen.getByPlaceholderText('YouTube, Twitter/X, or Reddit URL...')
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=abc' } })

    expect(onContentUrlChange).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })

  // 5. Detects Twitter/X URL — typing triggers onContentUrlChange
  it('calls onContentUrlChange when typing a Twitter URL', async () => {
    const onContentUrlChange = vi.fn()
    render(<AddContentModal {...defaultProps({ onContentUrlChange })} />)

    const input = screen.getByPlaceholderText('YouTube, Twitter/X, or Reddit URL...')
    fireEvent.change(input, { target: { value: 'https://twitter.com/user/status/123' } })

    expect(onContentUrlChange).toHaveBeenCalledWith('https://twitter.com/user/status/123')
  })

  // 6. Switches to note step — clicking "Write a note" calls onGoToNoteStep
  it('calls onGoToNoteStep when clicking the Write a note button', async () => {
    const user = userEvent.setup()
    const onGoToNoteStep = vi.fn()
    render(<AddContentModal {...defaultProps({ onGoToNoteStep })} />)

    await user.click(screen.getByText('Write a note'))

    expect(onGoToNoteStep).toHaveBeenCalledTimes(1)
  })

  // 7. Note step shows textarea and accepts text
  it('shows note textarea on the note step and calls onNoteTextChange', () => {
    const onNoteTextChange = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'note',
          onNoteTextChange,
        })}
      />,
    )

    const textarea = screen.getByPlaceholderText('Share a thought, reminder, or message...')
    expect(textarea).toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    expect(onNoteTextChange).toHaveBeenCalledWith('Hello world')
  })

  // 8. Cancel button on note step calls onResetToInput and clears text
  it('calls onResetToInput and onNoteTextChange when clicking Cancel on note step', async () => {
    const user = userEvent.setup()
    const onResetToInput = vi.fn()
    const onNoteTextChange = vi.fn()
    const onNoteDueDateChange = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'note',
          noteText: 'some text',
          onResetToInput,
          onNoteTextChange,
          onNoteDueDateChange,
        })}
      />,
    )

    await user.click(screen.getByText('Cancel'))

    expect(onResetToInput).toHaveBeenCalledTimes(1)
    expect(onNoteTextChange).toHaveBeenCalledWith('')
    expect(onNoteDueDateChange).toHaveBeenCalledWith('')
  })

  // 9. Continue button is disabled with empty URL input
  it('disables the Continue button when URL input is empty', () => {
    render(<AddContentModal {...defaultProps({ contentUrl: '' })} />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  // 10. Continue button is disabled for non-supported URLs
  it('disables the Continue button when URL is not a recognized type', () => {
    render(<AddContentModal {...defaultProps({ contentUrl: 'https://example.com' })} />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  // 11. Continue button is enabled for a valid YouTube URL
  it('enables the Continue button when URL is a valid YouTube URL', () => {
    render(<AddContentModal {...defaultProps({ contentUrl: 'https://youtube.com/watch?v=abc' })} />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).not.toBeDisabled()
  })

  // 12. Continue button calls onUrlSubmit
  it('calls onUrlSubmit when clicking Continue with a valid URL', async () => {
    const user = userEvent.setup()
    const onUrlSubmit = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          contentUrl: 'https://youtube.com/watch?v=abc',
          onUrlSubmit,
        })}
      />,
    )

    await user.click(screen.getByText('Continue'))

    expect(onUrlSubmit).toHaveBeenCalledTimes(1)
  })

  // 13. Preview button on note step is disabled with empty note text
  it('disables the Preview button when note text is empty', () => {
    render(<AddContentModal {...defaultProps({ step: 'note', noteText: '' })} />)

    const previewButton = screen.getByText('Preview')
    expect(previewButton).toBeDisabled()
  })

  // 14. Preview button on note step is disabled when note is whitespace only
  it('disables the Preview button when note text is only whitespace', () => {
    render(<AddContentModal {...defaultProps({ step: 'note', noteText: '   ' })} />)

    const previewButton = screen.getByText('Preview')
    expect(previewButton).toBeDisabled()
  })

  // 15. Preview button on note step is enabled with text and calls onNoteSubmit
  it('calls onNoteSubmit when clicking Preview with valid note text', async () => {
    const user = userEvent.setup()
    const onNoteSubmit = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'note',
          noteText: 'My important note',
          onNoteSubmit,
        })}
      />,
    )

    const previewButton = screen.getByText('Preview')
    expect(previewButton).not.toBeDisabled()
    await user.click(previewButton)

    expect(onNoteSubmit).toHaveBeenCalledTimes(1)
  })

  // 16. Loading step shows spinner text
  it('shows loading state on the loading step', () => {
    render(<AddContentModal {...defaultProps({ step: 'loading' })} />)

    expect(screen.getByText('Fetching content details...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  // 17. Preview step shows YouTube preview
  it('shows YouTube preview on the preview step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'youtube',
          fetchedPreview: {
            title: 'Test Video Title',
            channel: 'Test Channel',
            duration: '5:30',
            thumbnail: 'https://example.com/thumb.jpg',
          },
        })}
      />,
    )

    expect(screen.getByText('Add to queue?')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
    expect(screen.getByText('Test Channel')).toBeInTheDocument()
    expect(screen.getByText('5:30')).toBeInTheDocument()
  })

  // 18. Preview step shows Twitter preview
  it('shows Twitter preview on the preview step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'tweet',
          fetchedPreview: {
            tweetAuthor: 'John Doe',
            tweetHandle: '@johndoe',
            tweetContent: 'This is a tweet',
          },
        })}
      />,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@johndoe')).toBeInTheDocument()
    expect(screen.getByText('This is a tweet')).toBeInTheDocument()
  })

  // 19. Preview step shows Reddit preview
  it('shows Reddit preview on the preview step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'reddit',
          fetchedPreview: {
            subreddit: 'r/reactjs',
            redditTitle: 'Cool React Post',
            redditBody: 'Some body text here',
          },
        })}
      />,
    )

    expect(screen.getByText('r/reactjs')).toBeInTheDocument()
    expect(screen.getByText('Cool React Post')).toBeInTheDocument()
    expect(screen.getByText('Some body text here')).toBeInTheDocument()
  })

  // 20. Preview step shows note preview
  it('shows note preview on the preview step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'note',
          noteText: 'My important note text',
        })}
      />,
    )

    expect(screen.getByText('Your note')).toBeInTheDocument()
    expect(screen.getByText('My important note text')).toBeInTheDocument()
  })

  // 21. Preview step — Add to Queue button calls onAddToQueue for non-image content
  it('calls onAddToQueue when clicking Add to Queue on preview step', async () => {
    const user = userEvent.setup()
    const onAddToQueue = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'youtube',
          fetchedPreview: { title: 'Test Video' },
          onAddToQueue,
        })}
      />,
    )

    await user.click(screen.getByText('Add to Queue'))

    expect(onAddToQueue).toHaveBeenCalledTimes(1)
  })

  // 22. Preview step — Cancel button calls onResetToInput for non-image content
  it('calls onResetToInput when clicking Cancel on preview step for non-image content', async () => {
    const user = userEvent.setup()
    const onResetToInput = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'youtube',
          fetchedPreview: { title: 'Test Video' },
          onResetToInput,
        })}
      />,
    )

    await user.click(screen.getByText('Cancel'))

    expect(onResetToInput).toHaveBeenCalledTimes(1)
  })

  // 23. Preview step — Cancel button calls onImageCancel for image content
  it('calls onImageCancel when clicking Cancel on preview step for image content', async () => {
    const user = userEvent.setup()
    const onImageCancel = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'image',
          imagePreviewUrl: 'blob:http://localhost/test-image',
          onImageCancel,
        })}
      />,
    )

    await user.click(screen.getByText('Cancel'))

    expect(onImageCancel).toHaveBeenCalledTimes(1)
  })

  // 24. Preview step — Add to Queue calls onImageUpload for image content
  it('calls onImageUpload when clicking Add to Queue on preview step for image content', async () => {
    const user = userEvent.setup()
    const onImageUpload = vi.fn()
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'image',
          imagePreviewUrl: 'blob:http://localhost/test-image',
          onImageUpload,
        })}
      />,
    )

    await user.click(screen.getByText('Add to Queue'))

    expect(onImageUpload).toHaveBeenCalledTimes(1)
  })

  // 25. Success step shows confirmation
  it('shows success confirmation on the success step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'success',
          pendingItemsCount: 3,
        })}
      />,
    )

    expect(screen.getByText('Added to queue!')).toBeInTheDocument()
    expect(screen.getByText('Position #4')).toBeInTheDocument()
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  // 26. Close button on input step calls onClose
  it('calls onClose when clicking the close button on input step', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AddContentModal {...defaultProps({ onClose })} />)

    await user.click(screen.getByLabelText('Close modal'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 27. Escape key calls onClose
  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn()
    render(<AddContentModal {...defaultProps({ onClose })} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // 28. Fetch error is shown on preview step
  it('shows fetch error message on preview step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'preview',
          detectedType: 'youtube',
          fetchError: 'Could not load video details',
        })}
      />,
    )

    expect(screen.getByText('Could not load video details')).toBeInTheDocument()
    expect(screen.getByText('Content will be added with limited preview')).toBeInTheDocument()
  })

  // 29. Note character counter is visible on note step
  it('shows character counter on note step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          step: 'note',
          noteText: 'Hello',
        })}
      />,
    )

    expect(screen.getByText('5/1000')).toBeInTheDocument()
  })

  // 30. Image validation error is displayed on input step
  it('shows image validation error on input step', () => {
    render(
      <AddContentModal
        {...defaultProps({
          imageValidationError: 'File too large (max 5MB)',
        })}
      />,
    )

    expect(screen.getByText('File too large (max 5MB)')).toBeInTheDocument()
  })
})
