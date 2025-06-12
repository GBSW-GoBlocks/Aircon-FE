import { User, MapPin, GraduationCap } from 'lucide-react';
import kang from '../images/kang.png';

export function ProfileCard() {
  return (
    <div className="relative aspect-[3/4] max-w-[240px] w-full rounded-2xl overflow-hidden shadow-md transition-all duration-300 bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-lime-50 via-emerald-50 to-white z-0"></div>
      <div className="relative h-[60%] p-3 z-10">
        <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-emerald-200 to-lime-200 flex items-center justify-center">
          {kang ? (
            <img src={kang} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-lime-500 flex items-center justify-center">
              <User className="w-16 h-16 text-white opacity-90" />
            </div>
          )}
        </div>

        <div className="absolute -bottom-2.5 right-5 bg-white rounded-full p-1.5 border-2 border-lime-100 z-10">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
        </div>
      </div>

      <div className="relative h-[40%] bg-gradient-to-r from-white to-lime-50 px-4 py-3 rounded-t-2xl z-10">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-emerald-400 to-lime-400 rounded-full"></div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-800 bg-gradient-to-r from-emerald-600 to-lime-600 bg-clip-text">
              강백호
            </h1>
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center text-gray-600">
              <MapPin className="w-3 h-3 mr-1 text-emerald-500" />
              <p className="font-medium">경북소프트웨어고등학교</p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <p>2학년 2반 1번</p>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                재학생
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  )
}