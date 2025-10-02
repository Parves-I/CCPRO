import { exportToExcel, exportToFile, exportToPDF } from '../export';
import { utils, writeFile } from 'xlsx';
import type { Calendar, Project } from '../types';
import jsPDF from 'jspdf';

// Mocking xlsx library
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

// Mock jsPDF
const mockAutoTable = jest.fn();
const mockSave = jest.fn();
const mockText = jest.fn();
const mockLine = jest.fn();
const mockSetDrawColor = jest.fn();
const mockSetLineWidth = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockSetFont = jest.fn();
const mockSvg = jest.fn();
const mockSetPage = jest.fn();

jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    autoTable: mockAutoTable,
    save: mockSave,
    text: mockText,
    line: mockLine,
    setDrawColor: mockSetDrawColor,
    setLineWidth: mockSetLineWidth,
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    setFont: mockSetFont,
    svg: mockSvg,
    setPage: mockSetPage,
    internal: {
      pageSize: {
        getWidth: () => 595, // A4 width in px
        getHeight: () => 842, // A4 height in px
      },
      pages: [1, 2, 3], // Simulate 2 pages for footer loop (length is 3, so pageCount is 2)
    },
  }));
});


// Mocking browser-specific features
Object.defineProperty(window, 'alert', { value: jest.fn() });
Object.defineProperty(window.URL, 'createObjectURL', { value: jest.fn() });
Object.defineProperty(window.URL, 'revokeObjectURL', { value: jest.fn() });

const mockProject: Project = {
  id: 'proj1',
  name: 'Test Project',
  userId: 'user1',
  createdAt: new Date(),
};

const mockCalendar: Calendar = {
  id: 'cal1',
  name: 'Test Calendar',
  projectId: 'proj1',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  calendarData: {
    '2024-01-10': {
      title: 'Post 1',
      status: 'Published',
      types: ['Blog', 'Social'],
      platforms: ['Instagram', 'Website'],
      notes: 'Some notes for post 1',
      color: 'blue',
    },
    '2024-01-05': {
      title: 'Post 2',
      status: 'Draft',
      types: ['Video'],
      platforms: ['YouTube'],
      notes: 'Some notes for post 2',
      color: 'green',
    },
  },
};

const emptyCalendar: Calendar = {
  id: 'cal2',
  name: 'Empty Calendar',
  projectId: 'proj2',
  startDate: '',
  endDate: '',
  calendarData: {},
};

describe('exportToPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jsPDF as jest.Mock).mockClear();
  });

  it('should generate a PDF with the correct content and structure', () => {
    exportToPDF(mockProject, mockCalendar);

    // Check header
    expect(mockSetFontSize).toHaveBeenCalledWith(24);
    expect(mockSetTextColor).toHaveBeenCalledWith('#4f46e5'); // primaryColor
    expect(mockText).toHaveBeenCalledWith('Content Calendar', 40, 60);
    expect(mockText).toHaveBeenCalledWith('Test Project', 40, 80);
    expect(mockText).toHaveBeenCalledWith('Test Calendar', 40, 95);
    expect(mockLine).toHaveBeenCalledWith(40, 105, 555, 105);

    // Check table
    expect(mockAutoTable).toHaveBeenCalledTimes(1);
    expect(mockAutoTable.mock.calls[0][0].body.length).toBe(2); // 2 posts
    expect(mockAutoTable.mock.calls[0][0].body[0][1].content).toBe('Post 2'); // Sorted by date
    expect(mockAutoTable.mock.calls[0][0].body[1][1].content).toBe('Post 1');

    // Check footer
    expect(mockSetPage).toHaveBeenCalledWith(1);
    expect(mockSetPage).toHaveBeenCalledWith(2);
    expect(mockText).toHaveBeenCalledWith(expect.stringMatching(/Page 1 of 2/), 555, 822, { align: 'right' });
    expect(mockText).toHaveBeenCalledWith(expect.stringMatching(/Page 2 of 2/), 555, 822, { align: 'right' });


    // Check save
    expect(mockSave).toHaveBeenCalledWith('Test Project-Test Calendar-export.pdf');
  });

  it('should show an alert if project or calendar data is missing', () => {
    exportToPDF(null, mockCalendar);
    expect(window.alert).toHaveBeenCalledWith('Project and calendar data are required.');

    exportToPDF(mockProject, null);
    expect(window.alert).toHaveBeenCalledWith('Project and calendar data are required.');
  });

  it('should show an alert if calendar has no content', () => {
    exportToPDF(mockProject, emptyCalendar);
    expect(window.alert).toHaveBeenCalledWith('No content to export.');
    expect(mockSave).not.toHaveBeenCalled();
  });
});


describe('exportToFile', () => {
    // Mock anchor element
    const mockAnchorElement = {
        href: '',
        download: '',
        click: jest.fn(),
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchorElement as any);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});


  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger a download with the correct data and filename', () => {
    exportToFile(mockCalendar);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchorElement.download).toBe('Test-Calendar.ccpro');
    expect(mockAnchorElement.click).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchorElement);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('should show an alert if there is no data to export', () => {
    exportToFile(emptyCalendar);
    expect(window.alert).toHaveBeenCalledWith('There is nothing to save.');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('exportToExcel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

  it('should call xlsx functions with correct data and formatting', () => {
    const sheet = { '!cols': [] };
    (utils.json_to_sheet as jest.Mock).mockReturnValue(sheet);
    (utils.book_new as jest.Mock).mockReturnValue({});

    exportToExcel(mockCalendar);

    expect(utils.json_to_sheet).toHaveBeenCalledWith(
      [
        {
          Date: '2024-01-05',
          Title: 'Post 2',
          Status: 'Draft',
          'Post Types': 'Video',
          Platforms: 'YouTube',
          Notes: 'Some notes for post 2',
          Color: 'green',
        },
        {
          Date: '2024-01-10',
          Title: 'Post 1',
          Status: 'Published',
          'Post Types': 'Blog, Social',
          Platforms: 'Instagram, Website',
          Notes: 'Some notes for post 1',
          Color: 'blue',
        },
      ],
    );
    expect(utils.book_new).toHaveBeenCalled();
    expect(utils.book_append_sheet).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(expect.any(Object), 'Test-Calendar-export.xlsx');
    expect(sheet['!cols']).toBeDefined();
  });

  it('should show an alert if calendar data is empty', () => {
    exportToExcel(emptyCalendar);
    expect(window.alert).toHaveBeenCalledWith('No data to export.');
    expect(utils.json_to_sheet).not.toHaveBeenCalled();
  });
});