// import React, { useEffect, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { CheckCircle } from "lucide-react"; // Icon for success UI
// import api from "../../components/User-management/api";
// import { ClipLoader } from "react-spinners";

// const SuccessPage = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [status, setStatus] = useState("pending");

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setLoading(false);
//     }, 800);

//     return () => clearTimeout(timer);
//   }, []);
//   useEffect(() => {
//     const verifyPayment = async () => {
//       const queryParams = new URLSearchParams(location.search);
//       const transactionId = queryParams.get("transactionId");
//       const paymentId = queryParams.get("paymentId");
//       const payerId = queryParams.get("PayerID");

//       if (!transactionId || !paymentId || !payerId) {
//         setStatus("failed");
//         setLoading(false);
//         return;
//       }

//       try {
//         const response = await api.get(
//           `/success?transactionId=${transactionId}&paymentId=${paymentId}&PayerID=${payerId}`,
//           { withCredentials: true }
//         );

//         if (response.data.success) {
//           setStatus("completed");
//         } else {
//           setStatus("failed");
//         }
//       } catch (error) {
//         console.error("Error verifying payment:", error);
//         setStatus("failed");
//       } finally {
//         setLoading(false);
//       }
//     };

//     verifyPayment();
//   }, [location.search]);

//   if (loading)
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <ClipLoader size={80} color="#FFA500" />
//       </div>
//     );

//   return (
//     <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
//       {loading ? (
//         <div className="text-xl font-semibold text-gray-700">
//           🔄 Verifying Payment...
//         </div>
//       ) : status === "completed" ? (
//         <div className="text-center">
//           <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
//           <h2 className="text-2xl font-bold text-green-600">
//             Payment Successful!
//           </h2>
//           <p className="text-gray-700">
//             You have been successfully enrolled in the course.
//           </p>
//           <button
//             onClick={() => navigate(`/purchased-course`)}
//             className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
//           >
//             Go to Courses
//           </button>
//         </div>
//       ) : (
//         <div className="text-center">
//           <h2 className="text-2xl font-bold text-red-600">Payment Failed!</h2>
//           <p className="text-gray-700">
//             Something went wrong. Please try again.
//           </p>
//           <button
//             onClick={() => navigate("/user")}
//             className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
//           >
//             Return to Courses
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default SuccessPage;




import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react"; 
import { ClipLoader } from "react-spinners";
import api from "../../components/User-management/api";

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    const verifyPayment = async () => {
      const queryParams = new URLSearchParams(location.search);
      const transactionId = queryParams.get("transactionId");
      const paymentId = queryParams.get("paymentId");
      const payerId = queryParams.get("PayerID");

      if (!transactionId || !paymentId || !payerId) {
        setStatus("failed");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/success?transactionId=${transactionId}&paymentId=${paymentId}&PayerID=${payerId}`,
          { withCredentials: true }
        );

        if (response.data.success) {
          setStatus("completed");
          setLoading(false);
        } else if (retryCount < MAX_RETRIES) {
          // Retry verification after 3 seconds
          setTimeout(() => setRetryCount(retryCount + 1), 3000);
        } else {
          setStatus("failed");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => setRetryCount(retryCount + 1), 3000);
        } else {
          setStatus("failed");
          setLoading(false);
        }
      }
    };

    verifyPayment();
  }, [location.search, retryCount]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {loading || status === "pending" ? (
        <div className="text-xl font-semibold text-gray-700">
          🔄 Verifying Payment...
        </div>
      ) : status === "completed" ? (
        <div className="text-center">
          <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold text-green-600">
            Payment Successful!
          </h2>
          <p className="text-gray-700">
            You have been successfully enrolled in the course.
          </p>
          <button
            onClick={() => navigate(`/purchased-course`)}
            className="mt-4 px-6 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
          >
            Go to Courses
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Payment Failed!</h2>
          <p className="text-gray-700">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => navigate("/user")}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
          >
            Return to Courses
          </button>
        </div>
      )}
    </div>
  );
};

export default SuccessPage;

