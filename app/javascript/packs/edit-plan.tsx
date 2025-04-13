import { render, h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import PlanForm from './components/PlanForm';
import { IDatabasePlan, IPlanDay, IReading } from './interfaces/IPlan';
import { ensureBookShortName } from './components/bible/utilities';
import { checkScriptureRangeValidBSB } from './utilities/checkScriptureExistsBSB';
import books from './components/bible/books';

interface EditablePlanProps {
  initialPlan: IDatabasePlan;
}

function EditablePlan({ initialPlan }: EditablePlanProps) {
  const [plan, setPlan] = useState<IDatabasePlan>(initialPlan);
  const [planCover, setPlanCover] = useState<string>(initialPlan.cover_photo || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const errorsRef = useRef<HTMLDivElement>(null);

  const handleTitleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setPlan({...plan, name: target.value});
  };

  const handleDescriptionChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setPlan({...plan, description: target.value});
  };

  const handleDayTitleChange = (dayNumber: number, newTitle: string) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        return {...day, outline: newTitle};
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});
  };

  const handleReadingChange = (dayNumber: number, readingIndex: number, field: string, value: string) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        const updatedReadings = [...day.readings];
        updatedReadings[readingIndex] = {
          ...updatedReadings[readingIndex],
          [field]: value
        };
        return {...day, readings: updatedReadings};
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});
  };

  const toggleEntireChapter = (dayNumber: number, readingIndex: number, isEntireChapter: boolean) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        const updatedReadings = [...day.readings];
        updatedReadings[readingIndex] = {
          ...updatedReadings[readingIndex],
          verse_range: isEntireChapter ? "" : "1"
        };
        return {...day, readings: updatedReadings};
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});

    // Validate immediately after toggling
    setTimeout(validatePlan, 0);
  };

  const isEntireChapter = (reading: IReading): boolean => {
    return !reading.verse_range || reading.verse_range.trim() === "";
  };

  const handleBookChange = (dayNumber: number, readingIndex: number, newBookName: string) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        const updatedReadings = [...day.readings];
        const selectedBook = books.find(book => book.name === newBookName);

        // Get current chapter value
        const currentChapter = parseInt(updatedReadings[readingIndex].chapter as unknown as string);

        // Check if current chapter is valid for new book
        let newChapter = currentChapter;
        if (selectedBook && currentChapter > selectedBook.numberOfChapters) {
          newChapter = 1;
        }

        updatedReadings[readingIndex] = {
          ...updatedReadings[readingIndex],
          book: newBookName,
          chapter: newChapter
        };
        return {...day, readings: updatedReadings};
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});
  };

  const addReading = (dayNumber: number) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        return {
          ...day,
          readings: [
            ...day.readings,
            { book: "John", chapter: 1, verse_range: "1-5", why_selected: "New reading" }
          ]
        };
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});
  };

  const removeReading = (dayNumber: number, readingIndex: number) => {
    const updatedDays = plan.days.map(day => {
      if (day.day_number === dayNumber) {
        const updatedReadings = day.readings.filter((_, i) => i !== readingIndex);
        return {...day, readings: updatedReadings};
      }
      return day;
    });
    setPlan({...plan, days: updatedDays});
  };

  const addDay = () => {
    const lastDayNumber = plan.days.length > 0
      ? Math.max(...plan.days.map(d => d.day_number))
      : 0;

    const newDay: IPlanDay = {
      day_number: lastDayNumber + 1,
      outline: `Day ${lastDayNumber + 1}`,
      readings: [
        { book: "John", chapter: 1, verse_range: "1-5", why_selected: "New reading" }
      ]
    };

    setPlan({...plan, days: [...plan.days, newDay]});
  };

  const removeDay = (dayNumber: number) => {
    const updatedDays = plan.days
      .filter(day => day.day_number !== dayNumber)
      .map((day, index) => ({ ...day, day_number: index + 1 }));

    setPlan({...plan, days: updatedDays});
  };

  const updateCoverPhoto = (url: string) => {
    setPlanCover(url);
  };

  const validateReading = (reading: IReading, dayNumber: number, readingIndex: number): string | null => {
    try {
      const bookId = ensureBookShortName(reading.book);
      const isValid = checkScriptureRangeValidBSB(bookId, reading.chapter, reading.verse_range);
      if (!isValid) {
        return `Invalid scripture in day ${dayNumber}, reading ${readingIndex + 1}: ${reading.book} ${reading.chapter}:${reading.verse_range}`;
      }
    } catch (e) {
      return `Invalid book name in day ${dayNumber}, reading ${readingIndex + 1}: ${reading.book}`;
    }
    return null;
  };

  const readingHasErrors = (dayNumber: number, readingIndex: number): boolean => {
    return validationErrors.some(error =>
      error.includes(`day ${dayNumber}, reading ${readingIndex + 1}:`)
    );
  };

  const handleScriptureBlur = () => {
    validatePlan();
  };

  const validatePlan = (): boolean => {
    const errors: string[] = [];

    if (!plan.name || plan.name.trim() === '') {
      errors.push('Plan title is required');
    }

    if (plan.days.length === 0) {
      errors.push('Plan must have at least one day');
    }

    plan.days.forEach(day => {
      if (day.readings.length === 0) {
        errors.push(`Day ${day.day_number} must have at least one reading`);
      }

      day.readings.forEach((reading, idx) => {
        const error = validateReading(reading, day.day_number, idx);
        if (error) {
          errors.push(error);
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = () => {
    if (!validatePlan()) {
      if (errorsRef.current) {
        errorsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    setIsSubmitting(true);

    const nameField = document.getElementById('plan-name') as HTMLInputElement;
    nameField.value = plan.name;

    const descriptionField = document.getElementById('plan-description') as HTMLInputElement;
    descriptionField.value = plan.description;

    const coverPhotoField = document.getElementById('plan-cover-photo') as HTMLInputElement;
    coverPhotoField.value = planCover;

    const daysField = document.getElementById('plan-days') as HTMLInputElement;
    daysField.value = JSON.stringify(plan.days);

    const form = document.getElementById('plan-form') as HTMLFormElement;
    form.submit();
  };

  return (
    <div className="edit-plan-container">
      <div className="mb-4">
        <PlanForm
          allowSubmit={!isSubmitting}
          onSubmit={() => {}}
          initialCover={planCover}
          onCoverChange={updateCoverPhoto}
          hidePromptFields={true}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="plan-title" className="form-label">Plan Title</label>
        <input
          type="text"
          id="plan-title"
          className="form-control"
          value={plan.name}
          onChange={handleTitleChange}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="plan-description" className="form-label">Description</label>
        <textarea
          id="plan-description"
          className="form-control"
          rows={3}
          value={plan.description}
          onChange={handleDescriptionChange}
        />
      </div>

      {validationErrors.length > 0 && (
        <div className="alert alert-danger" ref={errorsRef}>
          <h5>Please fix the following errors:</h5>
          <ul>
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mb-3">Plan Days</h3>
      {plan.days.sort((a, b) => a.day_number - b.day_number).map(day => (
        <div key={day.day_number} className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="input-group" style={{ maxWidth: '70%' }}>
              <span className="input-group-text">Day {day.day_number}:</span>
              <input
                type="text"
                className="form-control"
                value={day.outline}
                onChange={(e) => handleDayTitleChange(day.day_number, (e.target as HTMLInputElement).value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeDay(day.day_number)}
            >
              Remove Day
            </button>
          </div>
          <div className="card-body">
            <h5>Readings</h5>
            {day.readings.map((reading, idx) => {
              const hasErrors = readingHasErrors(day.day_number, idx);
              const entireChapter = isEntireChapter(reading);

              return (
                <div key={idx} className={`border p-3 mb-3 ${hasErrors ? 'border-danger bg-danger bg-opacity-10' : ''}`}>
                  {hasErrors && (
                    <div className="text-danger mb-2 fw-bold">
                      <small>This scripture reference is invalid</small>
                    </div>
                  )}
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Book</label>
                      <select
                        className={`form-select ${hasErrors ? 'is-invalid' : ''}`}
                        value={reading.book}
                        onChange={(e) => handleBookChange(day.day_number, idx, (e.target as HTMLSelectElement).value)}
                        onBlur={handleScriptureBlur}
                      >
                        {books.map(book => (
                          <option key={book.id} value={book.name}>
                            {book.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Chapter</label>
                      <input
                        type="number"
                        className={`form-control ${hasErrors ? 'is-invalid' : ''}`}
                        value={reading.chapter}
                        onChange={(e) => handleReadingChange(day.day_number, idx, 'chapter', (e.target as HTMLInputElement).value)}
                        onBlur={handleScriptureBlur}
                      />
                    </div>
                    <div className="col-md-4">
                      <div className="btn-group w-100 mb-2" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name={`verseOption-${day.day_number}-${idx}`}
                          id={`verseRange-${day.day_number}-${idx}`}
                          checked={!entireChapter}
                          onChange={() => toggleEntireChapter(day.day_number, idx, false)}
                        />
                        <label
                          className="btn btn-outline-primary"
                          htmlFor={`verseRange-${day.day_number}-${idx}`}
                        >
                          Verse Range
                        </label>

                        <input
                          type="radio"
                          className="btn-check"
                          name={`verseOption-${day.day_number}-${idx}`}
                          id={`entireChapter-${day.day_number}-${idx}`}
                          checked={entireChapter}
                          onChange={() => toggleEntireChapter(day.day_number, idx, true)}
                        />
                        <label
                          className="btn btn-outline-primary"
                          htmlFor={`entireChapter-${day.day_number}-${idx}`}
                        >
                          Entire Chapter
                        </label>
                      </div>

                      {entireChapter ? (
                        <input
                          type="text"
                          className="form-control"
                          disabled
                          value="Entire chapter"
                        />
                      ) : (
                        <input
                          type="text"
                          className={`form-control ${hasErrors ? 'is-invalid' : ''}`}
                          value={reading.verse_range}
                          onChange={(e) => handleReadingChange(day.day_number, idx, 'verse_range', (e.target as HTMLInputElement).value)}
                          onBlur={handleScriptureBlur}
                          placeholder="e.g. 1-5, 7, 10-15"
                        />
                      )}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-12">
                      <label className="form-label">Selection reason</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={reading.why_selected}
                        onChange={(e) => handleReadingChange(day.day_number, idx, 'why_selected', (e.target as HTMLTextAreaElement).value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeReading(day.day_number, idx)}
                  >
                    Remove Reading
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => addReading(day.day_number)}
            >
              Add Reading
            </button>
          </div>
        </div>
      ))}

      <div className="d-flex flex-column gap-2 mb-4">
        <button
          type="button"
          className="btn btn-success"
          onClick={addDay}
        >
          Add New Day
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update Plan'}
        </button>
      </div>
    </div>
  );
}

const container = document.getElementById('plan-edit-container');
const planData = JSON.parse(container.getAttribute('data-plan') || '{}');
render(<EditablePlan initialPlan={planData} />, container);

