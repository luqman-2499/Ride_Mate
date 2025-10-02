import React, { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";

function Contact() {
  const [loading, setLoading] = useState(false); // For form submission/loading

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Add your form submission logic here (API or Drizzle ORM)
    setTimeout(() => setLoading(false), 2000); // Example delay
  };

  // Simple inline skeleton loader component
  const Skeleton = ({ className }) => (
    <div className={`bg-gray-300 animate-pulse rounded ${className}`}></div>
  );

  return (
    <section className="bg-white" id="contact">
      <div className="p-3">
        <Header />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-4 text-center">
          <h2 className="font-heading mb-4 font-bold tracking-tight text-[#222222] text-3xl sm:text-5xl">
            Get in Touch
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xl text-gray-700">
            Quantum MotorVault
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8">
          {/* Contact Info */}
          <div className="md:w-1/2 space-y-8">
            <p className="text-lg text-gray-700">
              Best Car Rental and Sales Provider website for buying and selling of cars and also for renting and booking of cars. Talk to the owner directly through chat.
            </p>

            <ul className="space-y-6">
              {/* Address */}
              <li className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0"></path>
                    <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#222222] mb-1">
                    Our Address
                  </h3>
                  <p className="text-gray-700">
                    #12, 3rd main road, Kammanhalli
                  </p>
                  <p className="text-gray-700">Bengaluru, Karnataka</p>
                </div>
              </li>

              {/* Contact */}
              <li className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2"></path>
                    <path d="M15 7a2 2 0 0 1 2 2"></path>
                    <path d="M15 3a6 6 0 0 1 6 6"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#222222] mb-1">
                    Contact
                  </h3>
                  <p className="text-gray-700">Mobile: +91 7259131181</p>
                  <p className="text-gray-700">Mail: nobysuke5@gmail.com</p>
                </div>
              </li>

              {/* Working Hours */}
              <li className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                  >
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"></path>
                    <path d="M12 7v5l3 3"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#222222] mb-1">
                    Working Hours
                  </h3>
                  <p className="text-gray-700">
                    Monday - Friday: 08:00am - 05:00pm
                  </p>
                  <p className="text-gray-700">
                    Saturday & Sunday: 08:00am - 12:00pm
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Contact Form */}
          <div className="md:w-1/2 bg-white shadow-lg rounded-lg p-6 md:p-12">
            <h2 className="mb-6 text-2xl font-bold text-[#222222]">
              Ready to Get Started?
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  id="name"
                  placeholder="Your Name"
                  required
                  className="w-full rounded-md border border-gray-400 py-2 px-3 shadow-sm focus:ring-[#0066CC] focus:border-[#0066CC]"
                />
              </div>
              <div>
                <input
                  type="email"
                  id="email"
                  placeholder="Your Email"
                  required
                  className="w-full rounded-md border border-gray-400 py-2 px-3 shadow-sm focus:ring-[#0066CC] focus:border-[#0066CC]"
                />
              </div>
              <div>
                <textarea
                  id="message"
                  rows="5"
                  placeholder="Write your message..."
                  className="w-full rounded-md border border-gray-400 py-2 px-3 shadow-sm focus:ring-[#0066CC] focus:border-[#0066CC]"
                ></textarea>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-md font-semibold hover:bg-[#005BBB] transition"
                >
                  {loading ? (
                    <Skeleton className="h-6 w-24 mx-auto" />
                  ) : (
                    "Send Message"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="p-3">
        <Footer />
      </div>
    </section>
  );
}

export default Contact;
