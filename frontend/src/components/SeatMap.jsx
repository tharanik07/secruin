const CATEGORY_COLORS = {
  VIP: 'bg-yellow-400 hover:bg-yellow-500',
  PREMIUM: 'bg-blue-400 hover:bg-blue-500',
  REGULAR: 'bg-green-400 hover:bg-green-500',
}

export default function SeatMap({ seats, selectedSeats, onToggleSeat }) {
  const rows = seats.reduce((acc, seat) => {
    const row = seat.rowName || 'A'
    if (!acc[row]) acc[row] = []
    acc[row].push(seat)
    return acc
  }, {})

  // Calculate price per category
  const prices = {}
  seats.forEach(s => { if (!prices[s.category]) prices[s.category] = s.price })

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 text-white text-center py-2 rounded-lg mb-4 text-sm">STAGE</div>

      {/* Legend with prices */}
      <div className="flex flex-wrap gap-3 justify-center mb-4 text-xs sm:text-sm bg-gray-50 p-3 rounded-lg">
        <span className="flex items-center gap-1"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded"></span> VIP — ₹{prices.VIP || '—'}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-400 rounded"></span> Premium — ₹{prices.PREMIUM || '—'}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded"></span> Regular — ₹{prices.REGULAR || '—'}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-400 rounded opacity-30"></span> Booked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 sm:w-4 sm:h-4 bg-indigo-600 rounded ring-2 ring-indigo-300"></span> Selected</span>
      </div>

      {/* Seat grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[320px]">
          {Object.entries(rows).sort().map(([rowName, rowSeats]) => (
            <div key={rowName} className="flex items-center gap-1 mb-1">
              <span className="w-5 text-xs text-gray-500 font-medium shrink-0">{rowName}</span>
              <div className="flex gap-1">
                {rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)).map(seat => {
                  const isSelected = selectedSeats.includes(seat.id)
                  const isAvailable = seat.status === 'AVAILABLE'
                  const baseColor = CATEGORY_COLORS[seat.category] || CATEGORY_COLORS.REGULAR

                  return (
                    <button key={seat.id} disabled={!isAvailable} onClick={() => onToggleSeat(seat)}
                      aria-label={`Seat ${rowName}${seat.seatNumber}, ${seat.category}, ₹${seat.price}, ${isAvailable ? (isSelected ? 'selected' : 'available') : seat.status.toLowerCase()}`}
                      aria-pressed={isSelected}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[10px] sm:text-xs font-medium transition-all
                        ${isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 scale-110' :
                          isAvailable ? baseColor + ' text-white' : 'bg-gray-400 opacity-30 cursor-not-allowed'}`}>
                      {seat.seatNumber}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
