module BibleHelper
  include BibleBooks

  def ensure_book_short_name(bookname)
    lookup = bookname.downcase
    book = BibleBooks::BOOKS.find do |b|
      b[:name].downcase == lookup || (b[:other_names]&.map(&:downcase)&.include?(lookup))
    end

    if book
      book[:id]
    else
      raise "Book name \"#{bookname}\" not found in books list"
    end
  end

  def short_name_to_long_name(short_name)
    book = BibleBooks::BOOKS.find { |b| b[:id] == short_name }
    book[:name]
  end

  def all_books
    BibleBooks::BOOKS
  end
end