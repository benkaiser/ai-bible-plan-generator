module BibleHelper
  include BibleBooks

  def ensure_book_short_name(bookname)
    lookup = bookname.downcase
    book = BOOKS.find do |b|
      b[:name].downcase == lookup || (b[:otherNames]&.map(&:downcase)&.include?(lookup))
    end

    if book
      book[:id]
    else
      raise "Book name \"#{bookname}\" not found in books list"
    end
  end

  def short_name_to_long_name(short_name)
    book = BOOKS.find { |b| b[:id] == short_name }
    book[:name]
  end

  def all_books
    BOOKS
  end
end