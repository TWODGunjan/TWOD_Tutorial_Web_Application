import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import api from "../../components/User-management/api";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import "react-datepicker/dist/react-datepicker.css";
import EnrollmentCalendar from "./EnrollmentCalendar";
import Navbar from "../../components/navbar/Navbar";
import Footer from "../../components/footer/Footer";
import Modal from "../../pages/login_signup/Modal";
import { formatDate } from "./EnrollmentCalendar";
import { useNavigate } from "react-router-dom";
import { useCurrencyConverter } from '../../currencyConfig/useCurrencyConverter';

const CourseDetailsPage = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [feedback, setFeedback] = useState({ rating: "", comment: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedDuration, setSelectedDuration] =
    useState("30 Minutes Session");
  const [sessions, setSessions] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null); // Track selected session
  const token = localStorage.getItem("token");
  const [isEditing, setIsEditing] = useState(false);
  const [updatedCourse, setUpdatedCourse] = useState({});
  const isRoleAdmin = localStorage.getItem("role");
  const navigate = useNavigate();
  const { convertAndFormat } = useCurrencyConverter();

  const handleCourseSummary = () => {
    if (
      !selectedDate ||
      !selectedTimeSlot ||
      !selectedDuration ||
      !selectedSession
    ) {
      alert("Please select all options before enrolling.");
      return;
    }
    if (!token) {
      alert("Authentication error: Please log in first.");
      return;
    }
    // Changed: Navigate to the '/course-summary' page.
    // Optionally, pass along selected details via the state object.
    navigate("/course-summary", {
      state: {
        course,
        selectedSession,
        selectedTutor,
        selectedDate,
        selectedTimeSlot,
        selectedDuration,
      },
    });
    // Changed: This path should correspond to your summary page route
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await api.get(`/courses/${courseId}`);
        setCourse(response.data);
        console.log(response.data);
        setSelectedSubject(response.data.courseType);
        setSelectedGrade(response.data.name); // Set grade from course name
        setUpdatedCourse({
          name: response.data.name,
          overview: response.data.overview,
          description: response.data.description,
          price: response.data.price,
          discountPrice: response.data.discountPrice,
          curriculum: response.data.curriculum || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    // Check if we have pre-filled data from Book Again
    if (location.state?.showEnrollModal) {
      console.log("Received prefill data:", location.state.prefillData);
      const { prefillData } = location.state;
      
      if (prefillData) {
        // Set all the required fields
        setSelectedTutor(prefillData.tutorId || "");
        setSelectedDate(new Date(prefillData.selectedDate));
        setSelectedTimeSlot(prefillData.selectedTime);
        setSelectedSubject(prefillData.subject || prefillData.courseType);
        setSelectedGrade(prefillData.grade);

        // Find and set the session based on duration
        const matchingSession = sessions.find(s => s.duration === prefillData.duration);
        if (matchingSession) {
          setSelectedSession(matchingSession);
          setSelectedDuration(prefillData.duration);
        }

        // Call handleEnrollClick to open modal and fetch tutors
        handleEnrollClick();
      }
    }
  }, [location.state, sessions]);

  const fetchSessions = async () => {
    try {
      const response = await api.get("/get-session");
      if (response.data.success) {
        setSessions(response.data.data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    setSelectedDuration(session.duration);
  };

  const handleInputChange = (e) => {
    setUpdatedCourse((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (Object.keys(updatedCourse).length === 0) {
      alert("No changes made!");
      return;
    }
    try {
      const response = await api.put(`/courses/update/${courseId}`, {
        ...updatedCourse,
        curriculum: updatedCourse.curriculum || [],
      });
      setCourse(response.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search);
      setShowLoginModal(true);
      return;
    }
    try {
      const response = await api.post(`/courses/${courseId}/feedback`, feedback);
      setCourse(response.data.course);
      setFeedback({ rating: "", comment: "" });
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
  };

  const handleEnrollClick = async () => {
    // If user is not logged in, show register modal
    if (!token) {
      sessionStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search);
      setShowLoginModal(true);
      return;
    }

    try {
      const response = await api.get(`/courses/${courseId}/tutors`);
      console.log("Fetched Tutors:", response.data);
      setTutors(response.data);
      setShowEnrollModal(true);
    } catch (error) {
      console.error("❌ Error fetching tutors:", error);
    }
  };

  const filterAvailableSlots = (slots, duration) => {
    if (!slots || slots.length === 0 || !duration) return [];
    console.log("Filtering slots for duration:", duration);
    const durationMap = {
      "30 Minutes Session": 30,
      "1 Hour Session": 60,
      "1.5 Hours Session": 90,
      "2 Hours Session": 120,
    };
    const durationInMinutes = durationMap[duration];
    if (!durationInMinutes) {
      console.error("Invalid duration:", duration);
      return [];
    }
    const filteredSlots = [];
    slots.forEach((slot) => {
      let currentStartTime = new Date(`1970-01-01T${slot.startTime}:00`);
      const endTime = new Date(`1970-01-01T${slot.endTime}:00`);
      console.log(`Processing slot: ${slot.startTime} - ${slot.endTime}`);
      while (currentStartTime < endTime) {
        let nextStartTime = new Date(
          currentStartTime.getTime() + durationInMinutes * 60000
        );
        console.log(
          `Checking slot: ${currentStartTime.toLocaleTimeString()} - ${nextStartTime.toLocaleTimeString()}`
        );
        if (nextStartTime <= endTime) {
          filteredSlots.push({
            startTime: currentStartTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endTime: nextStartTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
        currentStartTime = nextStartTime;
      }
    });
    console.log("Final Filtered Slots:", filteredSlots);
    return filteredSlots;
  };

  const handleTutorSelection = async (tutorId) => {
    setSelectedTutor(tutorId);
    setSelectedDate("");
    setAvailableDates([]);
    setAvailableTimeSlots([]);
    setSelectedTimeSlot("");
  
    if (!selectedSubject || !selectedGrade) {
      console.error("No subject or grade selected");
      return;
    }
  
    try {
      const response = await api.get(`/tutors/${tutorId}/available-dates`, {
        params: { subject: selectedSubject, grade: selectedGrade },
      });
      setAvailableDates(response.data);
    } catch (error) {
      console.error("Error fetching available dates:", error);
    }
  };
  
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!selectedSubject || !selectedGrade) return; // Ensure both subject and grade are selected
  
      let endpoint = `/tutors/no-preference/available-dates`;
  
      try {
        const response = await api.get(endpoint, {
          params: { subject: selectedSubject, grade: selectedGrade },
        });
        console.log("Available Dates (No Preference):", response.data);
        setAvailableDates(response.data);
      } catch (error) {
        console.error("Error fetching available dates:", error);
      }
    };
  
    if (selectedTutor === "") {
      fetchAvailableDates();
    }
  }, [selectedTutor, selectedSubject, selectedGrade]);
  
  const handleDateSelection = async (date) => {
    if (!selectedSubject || !selectedGrade) {
      console.error("No subject or grade selected");
      return;
    }
  
    setSelectedDate(date);
    setAvailableTimeSlots([]);
    setSelectedTimeSlot("");
  
    const formattedDate = date.toISOString().split("T")[0];
  
    try {
      console.log("Selected Date:", formattedDate);
      const response = await api.get(`/tutors/${selectedTutor}/available-slots`, {
        params: { date: formattedDate, subject: selectedSubject, grade: selectedGrade },
      });
  
      console.log("Raw Slots from Backend:", response.data);
      if (!selectedDuration) {
        console.error("No session duration selected");
        return;
      }
  
      console.log("Selected Duration:", selectedDuration);
      const filteredSlots = filterAvailableSlots(response.data, selectedDuration);
      setAvailableTimeSlots(filteredSlots);
    } catch (error) {
      console.error("Error fetching available time slots:", error);
    }
  };
  
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !selectedSubject || !selectedGrade) return;
  
      const formattedDate = selectedDate.toISOString().split("T")[0];
  
      let endpoint =
        selectedTutor === ""
          ? `/tutors/no-preference/available-slots`
          : `/tutors/${selectedTutor}/available-slots`;
  
      try {
        const response = await api.get(endpoint, {
          params: { date: formattedDate, subject: selectedSubject, grade: selectedGrade },
        });
  
        console.log("Available Slots:", response.data);
        if (!selectedDuration) {
          console.error("No session duration selected");
          return;
        }
  
        const filteredSlots = filterAvailableSlots(response.data, selectedDuration);
        setAvailableTimeSlots(filteredSlots);
      } catch (error) {
        console.error("Error fetching time slots:", error);
      }
    };
  
    fetchAvailableSlots();
  }, [selectedDate, selectedTutor, selectedSubject, selectedGrade]);
  
  const handleSessionDurationChange = (e) => {
    const selectedDuration = e.target.value;
    const session = sessions.find((s) => s.duration === selectedDuration);
    setSelectedSession(session);
    setSelectedDuration(selectedDuration);
  };
  
  useEffect(() => {
    if (selectedDate) {
      handleDateSelection(selectedDate);
    }
  }, [selectedDuration]);
  
  useEffect(() => {
    if (selectedTutor === "" && selectedDate && availableTimeSlots.length > 0) {
      console.log(
        "Re-filtering slots for No Preference due to session duration change..."
      );
  
      const fetchAndFilterSlots = async () => {
        try {
          const formattedDate = selectedDate.toISOString().split("T")[0];
          const response = await api.get(`/tutors/no-preference/available-slots`, {
            params: { date: formattedDate, subject: selectedSubject, grade: selectedGrade },
          });
  
          console.log("Refetched Slots (No Preference):", response.data);
          const updatedSlots = filterAvailableSlots(response.data, selectedDuration);
          setAvailableTimeSlots(updatedSlots);
        } catch (error) {
          console.error("Error re-fetching available slots:", error);
        }
      };
  
      fetchAndFilterSlots();
    }
  }, [selectedDuration]);
  



  useEffect(() => {
    if (sessions.length > 0) {
      const defaultSession = sessions.find(
        (s) => s.duration === "30 Minutes Session"
      );
      if (defaultSession) {
        setSelectedSession(defaultSession);
        setSelectedDuration(defaultSession.duration);
        filterAvailableSlots(defaultSession.duration);
      }
    }
  }, [sessions]);
  
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={80} color="#FFA500" />
      </div>
    );
  if (error) return <p>Error: {error}</p>;
  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">📚</div>
          <h2 className="text-3xl font-bold text-gray-800">Course not found</h2>
          <p className="text-gray-600">No details available for course</p>
          <Link
            to="/"
            className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 transform hover:scale-105"
          >
            Back to Categories
          </Link>
        </div>
      </div>
    );
  }
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 font-sans animate-fade-in max-sm:w-full">
        <div className="max-w-7xl mx-auto p-3 lg:p-8 max-sm:max-w-6xl">
          <header className="mb-12 max-sm:mb-5 text-center md:text-left">
            <div className="space-y-4 max-sm:space-y-1">
              <Link
                to={`/category/${encodeURIComponent(course.category)}`}
                className="inline-flex items-center text-orange-500 hover:text-orange-600 transition-colors duration-200 mx-auto md:mx-0"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to {course.category}
              </Link>

              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={updatedCourse.name}
                  onChange={(e) =>
                    setUpdatedCourse((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent border border-orange-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 block mx-auto md:mx-0"
                />
              ) : (
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {course.name}
                </h1>
              )}
              {isEditing ? (
                <textarea
                  name="overview"
                  value={updatedCourse.overview}
                  onChange={(e) =>
                    setUpdatedCourse((prev) => ({
                      ...prev,
                      overview: e.target.value,
                    }))
                  }
                  className="text-xl text-gray-600 font-medium border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <h2 className="text-xl text-gray-600 font-medium text-justify">
                  {course.overview}
                </h2>
              )}
            </div>
          </header>

          <div className="lg:grid lg:grid-cols-3 gap-8 ">
            <div className="lg:col-span-2 space-y-12 max-sm:space-y-6 max-sm:max-w-[100%] m-auto">
              <div className="w-full max-w-[650px] h-[450px] overflow-hidden rounded-md shadow-md max-sm:max-w-[250px] max-sm:max-h-[150px] max-sm:m-auto">
                <img
                  // src={`https://twod-tutorial-web-application-3brq.onrender.com${course.nameImage}`}
                  src={
                    `https://twod-tutorial-web-application-3brq.onrender.com${course.nameImage}` ||
                    `http://localhost:6001${course.nameImage}`
                  }
                  alt={course.nameImage}
                  className="w-full h-full max-sm:w-[100%] max-sm:object-contain m-auto"
                />
              </div>

              {isEditing ? (
                <section className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 max-sm:text-justify">
                  <h3 className="text-2xl font-bold mb-4 text-gray-800 max-sm:text-justify max-sm:text-xl">
                    Course Overview
                  </h3>
                  {/* <p className="text-gray-600 leading-relaxed">
                    {course.description}
                  </p> */}
                  <textarea
                    className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                    name="description"
                    value={updatedCourse.description}
                    onChange={handleInputChange}
                    placeholder="Enter course description"
                  />
                </section>
              ) : (
                <section className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300  m-auto">
                  <h3 className="text-2xl font-bold mb-4 text-gray-800 max-sm:text-xl">
                    Course Overview
                  </h3>
                  <p className="text-gray-600 leading-relaxed max-sm:text-sm">
                    {course.description}
                  </p>
                </section>
              )}

              <section className="space-y-6 m-auto max-sm:hidden block">
                <h3 className="text-3xl font-bold text-gray-800 max-sm:text-center">
                  Curriculum
                </h3>
                <div className="space-y-4">
                  {course?.curriculum?.map((module, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-orange-600 font-bold">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              name="sectionTitle"
                              value={
                                updatedCourse.curriculum?.[idx]?.sectionTitle ||
                                ""
                              }
                              onChange={(e) => {
                                setUpdatedCourse((prev) => {
                                  const newCurriculum = prev.curriculum
                                    ? [...prev.curriculum]
                                    : [];

                                  if (!newCurriculum[idx]) {
                                    newCurriculum[idx] = {};
                                  }

                                  newCurriculum[idx] = {
                                    ...newCurriculum[idx],
                                    sectionTitle: e.target.value,
                                  };

                                  return { ...prev, curriculum: newCurriculum };
                                });
                              }}
                              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                            />
                          ) : (
                            <h4 className="text-xl font-semibold text-gray-800">
                              {module.sectionTitle}
                            </h4>
                          )}

                          <ul className="mt-2 space-y-2">
                            {module.lessons?.map((lecture, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors duration-200"
                              >
                                {isEditing ? (
                                  <>
                                    {/* Lesson Title Input */}
                                    <input
                                      type="text"
                                      value={
                                        updatedCourse.curriculum?.[idx]
                                          ?.lessons?.[i]?.title || ""
                                      }
                                      onChange={(e) => {
                                        setUpdatedCourse((prev) => {
                                          const newCurriculum = prev.curriculum
                                            ? [...prev.curriculum]
                                            : [];

                                          if (!newCurriculum[idx])
                                            newCurriculum[idx] = {
                                              lessons: [],
                                            };
                                          if (!newCurriculum[idx].lessons)
                                            newCurriculum[idx].lessons = [];
                                          if (!newCurriculum[idx].lessons[i])
                                            newCurriculum[idx].lessons[i] = {};

                                          newCurriculum[idx].lessons[i] = {
                                            ...newCurriculum[idx].lessons[i],
                                            title: e.target.value,
                                          };

                                          return {
                                            ...prev,
                                            curriculum: newCurriculum,
                                          };
                                        });
                                      }}
                                      className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                    />

                                    {/* Lesson Duration Input */}
                                    <input
                                      type="text"
                                      value={
                                        updatedCourse.curriculum?.[idx]
                                          ?.lessons?.[i]?.duration || ""
                                      }
                                      onChange={(e) => {
                                        setUpdatedCourse((prev) => {
                                          const newCurriculum = prev.curriculum
                                            ? [...prev.curriculum]
                                            : [];

                                          if (!newCurriculum[idx])
                                            newCurriculum[idx] = {
                                              lessons: [],
                                            };
                                          if (!newCurriculum[idx].lessons)
                                            newCurriculum[idx].lessons = [];
                                          if (!newCurriculum[idx].lessons[i])
                                            newCurriculum[idx].lessons[i] = {};

                                          newCurriculum[idx].lessons[i] = {
                                            ...newCurriculum[idx].lessons[i],
                                            duration: e.target.value,
                                          };

                                          return {
                                            ...prev,
                                            curriculum: newCurriculum,
                                          };
                                        });
                                      }}
                                      className="w-20 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-gray-600">
                                      {lecture.title}
                                    </span>
                                    <span className="text-sm text-orange-600">
                                      {lecture.duration}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                          {module.quiz && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center text-orange-600">
                                <span className="font-medium">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={
                                        updatedCourse.curriculum?.[idx]?.quiz ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        setUpdatedCourse((prev) => ({
                                          ...prev,
                                          curriculum:
                                            prev.curriculum?.map(
                                              (module, modIdx) =>
                                                modIdx === idx
                                                  ? {
                                                      ...module,
                                                      quiz: e.target.value,
                                                    }
                                                  : module
                                            ) || [],
                                        }));
                                      }}
                                      className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                                    />
                                  ) : (
                                    <span className="text-gray-600">
                                      {module.quiz}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {course.feedbacks && (
                <section className="space-y-6 m-auto max-sm:hidden">
                  <h3 className=" text-3xl font-bold text-gray-800 max-sm:text-center max-sm:text-xl">
                    Student Feedback
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {course.feedbacks.map((feedback, i) => (
                      <div
                        key={i}
                        className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 max-sm:p-2"
                      >
                        <div className="flex items-start space-x-4">
                          <img
                            src={
                              `https://twod-tutorial-web-application-3brq.onrender.com${feedback.profilePicture}` ||
                              `http://localhost:6001${feedback.profilePicture}`
                            } //local
                            // src={`https://twod-tutorial-web-application-3brq.onrender.com${feedback.profilePicture}`}
                            alt="Profile"
                            className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center"
                          />

                          <div className="">
                            <p className="mt-3 font-medium text-gray-800">
                              {feedback.name}
                            </p>
                            <p className="text-gray-600 italic max-sm:w-40">
                              "{feedback.comment}"
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 text-yellow-500 transform max-sm:-translate-x-12">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const fullStars = Math.floor(feedback.rating);
                              const hasHalfStar = feedback.rating % 1 !== 0;
                              if (index < fullStars) {
                                return <FaStar key={index} />;
                              } else if (index === fullStars && hasHalfStar) {
                                return <FaStarHalfAlt key={index} />;
                              } else {
                                return <FaRegStar key={index} />;
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <form
                onSubmit={handleFeedbackSubmit}
                className="space-y-4 bg-white p-6 rounded-xl shadow-sm max-sm:hidden m-auto"
              >
                <h3 className="text-xl font-bold">Leave Your Feedback</h3>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedback({ ...feedback, rating: star })}
                      className={`w-8 h-8 ${
                        feedback.rating >= star
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedback.comment}
                  onChange={(e) =>
                    setFeedback({ ...feedback, comment: e.target.value })
                  }
                  placeholder="Write your feedback..."
                  className="w-full p-2 border rounded-lg"
                  required
                ></textarea>

                <button
                  type="submit"
                  className="text-orange-500 hover:text-white border border-orange-500 transition-colors py-2 px-4 rounded-lg hover:bg-orange-500"
                >
                  Submit Feedback
                </button>
                {isRoleAdmin === "admin" && (
                  <>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500"
                      >
                        Edit Course
                      </button>
                    ) : (
                      <button
                        type="submit"
                        onClick={(e) => {
                          setIsEditing(false);
                          handleUpdate(e);
                        }}
                        className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500"
                      >
                        Update
                      </button>
                    )}
                  </>
                )}
              </form>
            </div>

            <div className="space-y-8 mt-[-120px] max-sm:mt-0 order-2 lg:order-none pt-5 max-sm:max-w-[100%]  m-auto ">
              <div className="bg-white rounded-2xl p-6 shadow-lg fixed  max-sm:static top-24 right-4 sm:w-2/6 m-auto ">
                <div className="space-y-6 ">
                  <div className="text-center">
                    {selectedSession && (
                      <div className="price-display bg-gray-100 p-4 rounded-lg shadow-md">
                        <p className="text-lg font-medium">
                          Selected Session:{" "}
                          <span className="font-bold">
                            {selectedSession.duration}
                          </span>
                        </p>
                        <p className="text-gray-1200">
                          Price: {convertAndFormat(parseFloat(selectedSession?.price || 0))}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="session-selector-container">
                    <h2 className="text-2xl font-semibold mb-4 max-sm:text-xl">
                      Choose a Session Duration
                    </h2>

                    <div className="flex gap-4 mb-6 justify-center lg:justify-start max-sm:text-sm max-sm:grid max-sm:grid-cols-2">
                      {sessions.map((session, index) => (
                        <button
                          key={index}
                          className={`p-2 border rounded  ${
                            selectedSession?.duration === session.duration
                              ? "bg-orange-500 text-white"
                              : "bg-white text-black"
                          }`}
                          onClick={() => {
                            setSelectedSession(session);
                            setSelectedDuration(session.duration);
                            filterAvailableSlots(session.duration);
                          }}
                        >
                          {session.duration}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleEnrollClick}
                      className="w-full py-4  text-orange-500 rounded-xl border-2 hover:text-white border-orange-500 font-semibold hover:bg-orange-500 transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      Enroll Now
                    </button>

                    <button
                      onClick={() => alert("Previewing course...")}
                      className="w-full py-4 border-2 border-orange-500 text-orange-500 rounded-xl font-semibold hover:bg-orange-50 transition-colors duration-200"
                    >
                      Preview Course
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 justify-center lg:justify-start">
                      <svg
                        className="w-5 h-5 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 7h3m0 0h3m-3 0v3m0-3V7m-3 10h3m0 0h3m-3 0v3m0-3v-3m-6 3l-3-3m0 0l-3 3m3-3V7"
                        />
                      </svg>
                      <span className="text-gray-600">{course.level}</span>
                    </div>
                  </div>

                  {showEnrollModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center max-md:w-full max-sm:p-2">
                      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl max-md:w-96 w-full max-h-[90vh] overflow-y-auto">
                        {selectedSession && (
                          <div className="mb-4 p-4 bg-gray-100 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-700">
                              Selected Session
                            </h3>
                            <p className="text-gray-600">
                              Duration: {selectedDuration ||selectedSession.duration}
                            </p>
                            <p className="text-gray-600">
                              Price: {convertAndFormat(parseFloat(selectedSession?.price || 0))}
                            </p>  
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-500">
                            Course Name
                          </label>
                          <input
                            type="text"
                            value={course.name}
                            disabled
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                          />
                        </div>
                        <div className="flex max-sm:flex-col">
                          <div className="w-full sm:w-1/2 sm:pr-4">
                            <label className="block mb-2">Select Tutor:</label>
                            <select
                              className="w-full p-2 border rounded mb-4"
                              onChange={(e) =>
                                handleTutorSelection(e.target.value)
                              }
                            >
                              <option value="">
                                No Preference (Auto-Select)
                              </option>
                              {tutors.map((tutor) => (
                                <option key={tutor._id} value={tutor._id}>
                                  {tutor.name}
                                </option>
                              ))}
                            </select>

                            {/* <select
                                className="w-full p-2 border rounded mb-4"
                                value={selectedTimeSlot}
                                onChange={(e) =>
                                  setSelectedTimeSlot(e.target.value)
                                }
                                disabled={availableTimeSlots.length === 0}
                              >
                                <option value="">Choose a Time Slot</option>
                                {availableTimeSlots.length > 0 ? (
                                  availableTimeSlots.map((slot, index) => (
                                    <option
                                      key={index}
                                      value={${slot.startTime}-${slot.endTime}}
                                    >
                                      {slot.startTime} - {slot.endTime}
                                    </option>
                                  ))
                                ) : (
                                  <option disabled>
                                    No time slots available
                                  </option>
                                )}
                              </select> */}
                            <div className="block sm:hidden mb-4">
                              <EnrollmentCalendar
                                availableDates={availableDates.map(
                                  (date) => date.split("T")[0]
                                )} // Format to 'YYYY-MM-DD'
                                selectedDate={selectedDate}
                                onChange={(date) =>
                                  handleDateSelection(new Date(date))
                                }
                              />
                            </div>
                            <label className=" block mb-2">
                              Choose Time Slot:
                            </label>

                            <select
                              className="w-full p-2 border rounded mb-4"
                              value={selectedTimeSlot}
                              onChange={(e) =>
                                setSelectedTimeSlot(e.target.value)
                              }
                              disabled={availableTimeSlots.length === 0}
                            >
                              <option value="">Choose a Time Slot</option>
                              {availableTimeSlots.length > 0 ? (
                                availableTimeSlots.map((slot, index) => (
                                  <option
                                    key={index}
                                    value={`${slot.startTime}-${slot.endTime}`}
                                  >
                                    {slot.startTime} - {slot.endTime}
                                  </option>
                                ))
                              ) : (
                                <option disabled>
                                  No time slots available
                                </option>
                              )}
                            </select>

                            <label className="block mb-2">
                              Select Duration:
                            </label>
                            <select
                              className="w-full p-2 border rounded mb-4"
                              value={
                                selectedSession?.duration ||  selectedDuration ||
                                "30 Minutes Session"
                              }
                              onChange={(e) => {
                                const session = sessions.find(
                                  (s) => s.duration === e.target.value
                                );
                                if (session) {
                                  setSelectedSession(session);
                                  setSelectedDuration(session.duration);
                                  filterAvailableSlots(session.duration);
                                }
                              }}
                            >
                              {sessions.map((session, index) => (
                                <option key={index} value={session.duration}>
                                  {session.duration}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleCourseSummary} // New handler to navigate to the summary page
                              className="w-full py-2 bg-green-500 text-white rounded mt-4"
                            >
                              Course Summary
                            </button>
                            {/* <button
                              onClick={handleEnrollNow}
                              className="w-full py-2 bg-green-500 text-white rounded mt-4"
                            >
                              Confirm & Pay
                            </button> */}
                            <button
                              onClick={() => setShowEnrollModal(false)}
                              className="w-full py-2 mt-2 border border-gray-400 text-gray-600 rounded"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="hidden sm:block sm:w-1/2">
                            <EnrollmentCalendar
                              availableDates={availableDates.map(
                                (date) => date.split("T")[0]
                              )} // Format to 'YYYY-MM-DD'
                              selectedDate={selectedDate}
                              onChange={(date) =>
                                handleDateSelection(new Date(date))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {course.feedbacks && (
                <section className="sm:hidden m-auto p-4 space-y-6">
                  <h3 className="font-bold text-gray-800 text-center text-xl">
                    Student Feedback
                  </h3>
                  <div className="  ">
                    {course.feedbacks.map((feedback, i) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <img
                            src={
                              `https://twod-tutorial-web-application-3brq.onrender.com${feedback.profilePicture}` ||
                              `http://localhost:6001${feedback.profilePicture}`
                            } //local
                            // src={`https://twod-tutorial-web-application-3brq.onrender.com${feedback.profilePicture}`}
                            alt="Profile"
                            className="w-12 h-12 rounded-full bg-orange-100"
                          />

                          <div className="">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-800">
                                {feedback.name}
                              </p>
                              <div className="flex items-center space-x-1 text-yellow-500 ">
                                {Array.from({ length: 5 }).map((_, index) => {
                                  const fullStars = Math.floor(feedback.rating);
                                  const hasHalfStar = feedback.rating % 1 !== 0;
                                  if (index < fullStars) {
                                    return <FaStar key={index} />;
                                  } else if (
                                    index === fullStars &&
                                    hasHalfStar
                                  ) {
                                    return <FaStarHalfAlt key={index} />;
                                  } else {
                                    return <FaRegStar key={index} />;
                                  }
                                })}
                              </div>
                            </div>
                            <p className="text-gray-600 italic max-sm:w-40">
                              "{feedback.comment}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <form
                onSubmit={handleFeedbackSubmit}
                className="space-y-4 bg-white p-6 rounded-xl shadow-sm  m-auto sm:hidden"
              >
                <h3 className="text-xl font-bold">Leave Your Feedback</h3>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedback({ ...feedback, rating: star })}
                      className={`w-8 h-8 ${
                        feedback.rating >= star
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedback.comment}
                  onChange={(e) =>
                    setFeedback({ ...feedback, comment: e.target.value })
                  }
                  placeholder="Write your feedback..."
                  className="w-full p-2 border rounded-lg"
                  required
                ></textarea>

                <button
                  type="submit"
                  className="text-orange-500 hover:text-white border border-orange-500 transition-colors py-2 px-4 rounded-lg hover:bg-orange-500"
                >
                  Submit Feedback
                </button>
                {isRoleAdmin === "admin" && (
                  <>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500"
                      >
                        Edit Course
                      </button>
                    ) : (
                      <button
                        type="submit"
                        onClick={(e) => {
                          setIsEditing(false);
                          handleUpdate(e);
                        }}
                        className="bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500"
                      >
                        Update
                      </button>
                    )}
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Add the Modal component at the end of your JSX */}
      {showLoginModal && (
        <Modal
          initialAction="Login"
          onClose={() => setShowLoginModal(false)}
        />
      )}
      <Footer />
    </>
  );
};

export default CourseDetailsPage;
